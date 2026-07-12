# ESG Odoo — PERN Stack

> **P**ostgreSQL · **E**xpress · **R**eact · **N**ode.js

A full-stack ESG management platform built on the PERN stack.

---

## 📁 Project Structure

```
esg-odoo/
├── client/                 # React + Vite frontend (port 5173)
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── context/        # React Context (Auth)
│   │   ├── pages/          # Page components (Login, Register, Dashboard)
│   │   ├── services/       # Axios API service
│   │   └── styles/         # CSS per feature
│   └── vite.config.js      # Proxy → localhost:5000
│
├── server/                 # Express + Node.js backend (port 5000)
│   └── src/
│       ├── controllers/    # Business logic
│       ├── db/             # Pool, migrations, seed
│       ├── middleware/     # JWT auth, validation
│       └── routes/         # API route definitions
│
└── package.json            # Root scripts (concurrently)
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 18
- PostgreSQL ≥ 14 (running locally or via Docker)

### 1. Install Dependencies

```bash
npm run install:all
```

### 2. Configure Environment

Edit `server/.env` with your PostgreSQL credentials:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=esg_odoo_db
DB_USER=postgres
DB_PASSWORD=your_password_here
JWT_SECRET=your_super_secret_jwt_key
```

### 3. Create the Database

```sql
-- In psql or pgAdmin:
CREATE DATABASE esg_odoo_db;
```

### 4. Run Migrations

```bash
cd server && npm run migrate
```

### 5. (Optional) Seed Default Admin

```bash
cd server && npm run seed
# Admin: admin@esg-odoo.com / Admin@1234
```

### 6. Start Development Servers

```bash
# From the root — starts both server + client concurrently
npm run dev
```

| Service  | URL                         |
|----------|-----------------------------|
| API      | http://localhost:5000/api   |
| Frontend | http://localhost:5173       |
| Health   | http://localhost:5000/api/health |

---

## 🔌 API Endpoints

### Auth
| Method | Endpoint            | Auth     | Description        |
|--------|---------------------|----------|--------------------|
| POST   | `/api/auth/register`| Public   | Register a user    |
| POST   | `/api/auth/login`   | Public   | Login, get JWT     |
| GET    | `/api/auth/me`      | JWT      | Get current user   |

### Users
| Method | Endpoint         | Role           | Description        |
|--------|------------------|----------------|--------------------|
| GET    | `/api/users`     | admin+         | List all users     |
| GET    | `/api/users/:id` | any            | Get user by ID     |
| PUT    | `/api/users/:id` | admin+         | Update user        |
| DELETE | `/api/users/:id` | superadmin     | Delete user        |

---

## 🛠 Tech Stack

| Layer      | Technology           |
|------------|----------------------|
| Database   | PostgreSQL + `pg`    |
| Backend    | Node.js + Express 4  |
| Auth       | JWT + bcryptjs       |
| Frontend   | React 19 + Vite 8    |
| Routing    | react-router-dom 7   |
| HTTP       | Axios                |
| Security   | Helmet + CORS        |
