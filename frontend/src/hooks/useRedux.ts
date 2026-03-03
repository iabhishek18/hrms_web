// ============================================
// Typed Redux Hooks
// ============================================
// These hooks provide type-safe access to the Redux store
// throughout the application. Always use these instead of
// the plain `useDispatch` and `useSelector` from react-redux
// to get proper TypeScript inference.

import { useDispatch, useSelector } from 'react-redux';
import type { TypedUseSelectorHook } from 'react-redux';
import type { RootState, AppDispatch } from '@/store/store';

/**
 * Typed version of `useDispatch` that knows about our thunk middleware.
 *
 * Usage:
 * ```ts
 * const dispatch = useAppDispatch();
 * dispatch(fetchEmployees({ page: 1 })); // fully typed
 * ```
 */
export const useAppDispatch: () => AppDispatch = useDispatch;

/**
 * Typed version of `useSelector` that knows the shape of our store.
 *
 * Usage:
 * ```ts
 * const user = useAppSelector((state) => state.auth.user);
 * // `state` is fully typed as RootState — autocomplete works
 * ```
 */
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
