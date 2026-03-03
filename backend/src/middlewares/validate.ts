// ============================================
// Zod Validation Middleware
// ============================================
// Generic middleware factory that validates request data (body, params, query)
// against a Zod schema. Returns 422 Unprocessable Entity with detailed
// field-level errors if validation fails.
//
// Usage in routes:
//   import { validate } from '../middlewares/validate';
//   import { createEmployeeSchema } from '../utils/validators';
//
//   router.post('/employees', validate(createEmployeeSchema), employeeController.create);
//   router.get('/employees', validate(paginationSchema, 'query'), employeeController.list);
//   router.get('/employees/:id', validate(idParamSchema, 'params'), employeeController.getById);

import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError, ZodIssue } from 'zod';

/**
 * Specifies which part of the request to validate.
 *
 * - 'body'   → req.body   (POST, PUT, PATCH payloads)
 * - 'query'  → req.query  (URL query parameters)
 * - 'params' → req.params (URL path parameters like :id)
 */
type ValidationSource = 'body' | 'query' | 'params';

/**
 * Shape of a single field-level validation error returned in the response.
 */
interface ValidationError {
  field: string;
  message: string;
  code?: string;
}

/**
 * Formats Zod issues into a clean array of field-level error objects.
 * Handles nested paths by joining them with dots (e.g., "address.city").
 *
 * @param issues - Array of ZodIssue objects from a failed parse
 * @returns Array of formatted validation error objects
 */
function formatZodErrors(issues: ZodIssue[]): ValidationError[] {
  return issues.map((issue) => {
    // Join the path segments into a dot-separated field name
    // e.g., ["address", "city"] → "address.city"
    const field = issue.path.length > 0 ? issue.path.join('.') : 'unknown';

    return {
      field,
      message: issue.message,
      code: issue.code,
    };
  });
}

/**
 * Creates an Express middleware that validates request data against a Zod schema.
 *
 * If validation succeeds:
 *   - The validated (and potentially transformed) data replaces the original
 *     request data on the specified source (req.body, req.query, or req.params).
 *   - Calls next() to proceed to the next middleware/controller.
 *
 * If validation fails:
 *   - Responds with 422 Unprocessable Entity and a structured error payload
 *     containing field-level validation errors.
 *   - Does NOT call next(), stopping the request pipeline.
 *
 * @param schema - A Zod schema to validate against
 * @param source - Which part of the request to validate ('body' | 'query' | 'params')
 * @returns Express middleware function
 *
 * @example
 *   // Validate request body
 *   router.post(
 *     '/employees',
 *     validate(createEmployeeSchema),
 *     employeeController.create
 *   );
 *
 * @example
 *   // Validate query parameters
 *   router.get(
 *     '/employees',
 *     validate(employeeFilterSchema, 'query'),
 *     employeeController.list
 *   );
 *
 * @example
 *   // Validate URL params
 *   router.get(
 *     '/employees/:id',
 *     validate(idParamSchema, 'params'),
 *     employeeController.getById
 *   );
 */
export function validate(
  schema: ZodSchema<any>,
  source: ValidationSource = 'body',
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Determine which part of the request to validate
      const dataToValidate = req[source];

      // Run Zod validation (parse throws on failure, safeParse does not)
      // Using parse so we can catch and format the error ourselves
      const validatedData = schema.parse(dataToValidate);

      // Replace the raw request data with the validated & transformed data.
      // This ensures that downstream handlers receive clean, typed data.
      // For example, Zod transforms like `.trim()` or `.toLowerCase()`
      // will be reflected in the request object.
      switch (source) {
        case 'body':
          req.body = validatedData;
          break;
        case 'query':
          // TypeScript doesn't allow direct assignment to req.query,
          // so we merge the validated data onto the existing query object
          Object.keys(req.query).forEach((key) => delete (req.query as any)[key]);
          Object.assign(req.query, validatedData);
          break;
        case 'params':
          Object.keys(req.params).forEach((key) => delete (req.params as any)[key]);
          Object.assign(req.params, validatedData);
          break;
      }

      // Validation passed — continue to the next middleware
      next();
    } catch (error) {
      // Handle Zod validation errors specifically
      if (error instanceof ZodError) {
        const formattedErrors = formatZodErrors(error.issues);

        res.status(422).json({
          success: false,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: formattedErrors,
          // Include the total number of errors for convenience
          errorCount: formattedErrors.length,
        });
        return;
      }

      // If it's not a ZodError, something unexpected happened —
      // pass it along to the global error handler
      next(error);
    }
  };
}

/**
 * Validates multiple sources in a single middleware call.
 * Useful when a route needs to validate both params and body simultaneously.
 *
 * @param schemas - An object mapping validation sources to their Zod schemas
 * @returns Express middleware function
 *
 * @example
 *   router.put(
 *     '/employees/:id',
 *     validateMultiple({
 *       params: idParamSchema,
 *       body: updateEmployeeSchema,
 *     }),
 *     employeeController.update
 *   );
 */
export function validateMultiple(
  schemas: Partial<Record<ValidationSource, ZodSchema<any>>>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const allErrors: ValidationError[] = [];

    for (const [source, schema] of Object.entries(schemas) as [ValidationSource, ZodSchema<any>][]) {
      if (!schema) continue;

      try {
        const dataToValidate = req[source];
        const validatedData = schema.parse(dataToValidate);

        // Apply validated data back to the request
        switch (source) {
          case 'body':
            req.body = validatedData;
            break;
          case 'query':
            Object.keys(req.query).forEach((key) => delete (req.query as any)[key]);
            Object.assign(req.query, validatedData);
            break;
          case 'params':
            Object.keys(req.params).forEach((key) => delete (req.params as any)[key]);
            Object.assign(req.params, validatedData);
            break;
        }
      } catch (error) {
        if (error instanceof ZodError) {
          // Prefix each error's field with the source for clarity
          // e.g., "params.id", "body.firstName"
          const prefixedErrors = formatZodErrors(error.issues).map((err) => ({
            ...err,
            field: `${source}.${err.field}`,
          }));
          allErrors.push(...prefixedErrors);
        } else {
          // Unexpected error — delegate to global error handler
          next(error);
          return;
        }
      }
    }

    // If any validation errors were collected, respond with 422
    if (allErrors.length > 0) {
      res.status(422).json({
        success: false,
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        errors: allErrors,
        errorCount: allErrors.length,
      });
      return;
    }

    // All validations passed
    next();
  };
}

export default validate;
