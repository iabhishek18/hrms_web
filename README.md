# HRMS Web Application

A complete, production-ready Human Resource Management System built with modern technologies.

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **Redux Toolkit** for state management
- **React Router v6** for routing
- **Recharts** for dashboard charts
- **Axios** for HTTP requests
- **React Hook Form + Zod** for form validation

### Backend
- **Node.js + Express** with TypeScript
- **PostgreSQL** with Prisma ORM
- **JWT** authentication with role-based access control
- **bcrypt** for password hashing
- **Zod** for request validation

### DevOps
- **Docker + Docker Compose** for containerization
- **ESLint + Prettier** for code quality

---

## Features

- 🔐 **Authentication** — Login, Register, Logout with JWT tokens
- 📊 **Dashboard** — Stats overview, charts, summary cards, top performers
- 👥 **Employee Management** — Full CRUD, search, filter, department assignment
- 🏖️ **Leave Management** — Apply, approve, reject leaves with balance tracking
- ⏰ **Attendance Management** — Clock in/out, attendance reports, summaries
- 🔑 **Roles & Permissions** — Admin, HR, Employee role-based access
- 👤 **Profile Management** — View and update personal profile
- ⚙️ **Settings** — System and account settings

---

## Project Structure

```
hrms_web/
├── frontend/                # React frontend application
│   ├── public/
│   ├── src/
│   │   ├── api/             # Axios instance & API service functions
│   │   ├── assets/          # Static assets (images, icons)
│   │   ├── components/      # Reusable UI components
│   │   │   ├── ui/          # Base UI components (Button, Input, Modal, etc.)
│   │   │   └── common/      # Shared composite components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── layouts/         # Layout components (DashboardLayout, AuthLayout)
│   │   ├── pages/           # Page components organized by module
│   │   │   ├── auth/
│   │   │   ├── dashboard/
│   │   │   ├── employees/
│   │   │   ├── leave/
│   │   │   ├── attendance/
│   │   │   ├── profile/
│   │   │   └── settings/
│   │   ├── store/           # Redux Toolkit store & slices
│   │   │   └── slices/
│   │   ├── types/           # TypeScript type definitions
│   │   ├── utils/           # Utility functions
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── package.json
│   ├── tailwind.config.js
│   ├── tsconfig.json
│   └── vite.config.ts
│
├── backend/                 # Express backend application
│   ├── src/
│   │   ├── config/          # Database & app configuration
│   │   ├── controllers/     # Route controllers
│   │   ├── middlewares/      # Auth, error handling, validation middleware
│   │   ├── models/          # Prisma schema & database models
│   │   ├── routes/          # Express route definitions
│   │   ├── services/        # Business logic layer
│   │   ├── seeds/           # Database seed data
│   │   ├── utils/           # Utility functions & helpers
│   │   ├── app.ts           # Express app setup
│   │   └── server.ts        # Server entry point
│   ├── prisma/
│   │   └── schema.prisma    # Prisma database schema
│   ├── package.json
│   └── tsconfig.json
│
├── docker-compose.yml
├── Dockerfile.frontend
├── Dockerfile.backend
├── .env.example
└── README.md
```

---

## Prerequisites

- **Node.js** >= 18.x
- **npm** >= 9.x (or yarn/pnpm)
- **PostgreSQL** >= 14.x (or use Docker)
- **Docker & Docker Compose** (optional, for containerized setup)

---

## Getting Started

### Option 1: Docker (Recommended)

The fastest way to get everything running:

```bash
# 1. Clone the repository
cd hrms_web

# 2. Copy environment variables
cp .env.example .env

# 3. Update .env with your desired values (defaults work for Docker)

# 4. Start all services
docker-compose up --build

# 5. Run database migrations & seed
docker-compose exec backend npx prisma migrate dev
docker-compose exec backend npx ts-node src/seeds/seed.ts
```

The application will be available at:
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **PostgreSQL:** localhost:5432

### Option 2: Manual Setup

#### 1. Set up PostgreSQL

Create a PostgreSQL database:

```sql
CREATE DATABASE hrms_db;
CREATE USER hrms_user WITH PASSWORD 'hrms_password';
GRANT ALL PRIVILEGES ON DATABASE hrms_db TO hrms_user;
```

#### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment variables
cp ../.env.example .env
# Edit .env with your database credentials

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Seed the database with sample data
npx ts-node src/seeds/seed.ts

# Start the development server
npm run dev
```

The backend API will be running at `http://localhost:5000`.

#### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```

The frontend will be running at `http://localhost:5173`.

---

## Default Login Credentials

After seeding the database, you can log in with these accounts:

| Role     | Email                  | Password     |
| -------- | ---------------------- | ------------ |
| Admin    | admin@hrms.com         | admin123     |
| HR       | hr@hrms.com            | hr123456     |
| Employee | john.doe@hrms.com      | employee123  |

---

## API Endpoints

### Authentication
| Method | Endpoint             | Description          | Auth Required |
| ------ | -------------------- | -------------------- | ------------- |
| POST   | /api/auth/register   | Register new user    | No            |
| POST   | /api/auth/login      | Login                | No            |
| POST   | /api/auth/logout     | Logout               | Yes           |
| GET    | /api/auth/me         | Get current user     | Yes           |

### Employees
| Method | Endpoint                  | Description            | Auth Required |
| ------ | ------------------------- | ---------------------- | ------------- |
| GET    | /api/employees            | List all employees     | Yes           |
| GET    | /api/employees/:id        | Get employee by ID     | Yes           |
| POST   | /api/employees            | Create employee        | Admin/HR      |
| PUT    | /api/employees/:id        | Update employee        | Admin/HR      |
| DELETE | /api/employees/:id        | Delete employee        | Admin         |

### Leave Management
| Method | Endpoint                  | Description            | Auth Required |
| ------ | ------------------------- | ---------------------- | ------------- |
| GET    | /api/leaves               | List leaves            | Yes           |
| POST   | /api/leaves               | Apply for leave        | Yes           |
| PUT    | /api/leaves/:id           | Update leave request   | Admin/HR      |
| PUT    | /api/leaves/:id/approve   | Approve leave          | Admin/HR      |
| PUT    | /api/leaves/:id/reject    | Reject leave           | Admin/HR      |

### Attendance
| Method | Endpoint                    | Description           | Auth Required |
| ------ | --------------------------- | --------------------- | ------------- |
| GET    | /api/attendance             | List attendance       | Yes           |
| POST   | /api/attendance/clock-in    | Clock in              | Yes           |
| POST   | /api/attendance/clock-out   | Clock out             | Yes           |
| GET    | /api/attendance/summary     | Attendance summary    | Admin/HR      |

### Dashboard
| Method | Endpoint                    | Description           | Auth Required |
| ------ | --------------------------- | --------------------- | ------------- |
| GET    | /api/dashboard/stats        | Dashboard statistics  | Yes           |
| GET    | /api/dashboard/charts       | Chart data            | Yes           |

### Settings
| Method | Endpoint             | Description           | Auth Required |
| ------ | -------------------- | --------------------- | ------------- |
| GET    | /api/settings        | Get settings          | Admin         |
| PUT    | /api/settings        | Update settings       | Admin         |

---

## Available Scripts

### Frontend

| Command             | Description                    |
| ------------------- | ------------------------------ |
| `npm run dev`       | Start development server       |
| `npm run build`     | Build for production           |
| `npm run preview`   | Preview production build       |
| `npm run lint`      | Lint with ESLint               |
| `npm run format`    | Format with Prettier           |

### Backend

| Command               | Description                    |
| --------------------- | ------------------------------ |
| `npm run dev`         | Start development server       |
| `npm run build`       | Build TypeScript               |
| `npm run start`       | Start production server        |
| `npm run lint`        | Lint with ESLint               |
| `npm run format`      | Format with Prettier           |
| `npm run seed`        | Seed the database              |

---

## Environment Variables

See `.env.example` for all required environment variables:

| Variable              | Description                          | Default               |
| --------------------- | ------------------------------------ | --------------------- |
| `DATABASE_URL`        | PostgreSQL connection string         | —                     |
| `JWT_SECRET`          | Secret key for JWT tokens            | —                     |
| `JWT_EXPIRES_IN`      | Token expiration time                | `7d`                  |
| `PORT`                | Backend server port                  | `5000`                |
| `VITE_API_URL`        | API URL for frontend                 | `http://localhost:5000/api` |
| `NODE_ENV`            | Environment (development/production) | `development`         |

---

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is licensed under the MIT License.