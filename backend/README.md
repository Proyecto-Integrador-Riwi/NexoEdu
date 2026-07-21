# NexoEDU — Backend

REST API for the student and graduate tracking platform. Educational institutions manage their students/graduates through **update campaigns**, run by institutional admins and a super admin, so records stay current over time.

## Tech stack

- **Runtime:** Node.js, Express 5
- **Database:** PostgreSQL (Supabase in production; with a local Postgres option for development)
- **Auth:** JWT (access + refresh); the access token travels in an `httpOnly` cookie
- **Passwords:** hashed with **bcrypt** (never plain text)
- **API docs:** Swagger / OpenAPI, served at `/api-docs`
- **Architecture:** MVC (Model → Controller → Route), one Model/Controller/Route trio per resource

## Project structure

```
backend/
├── models/        # Parameterized SQL only — no req/res, no HTTP logic
├── controllers/   # Request handling, validation, and response shaping
├── routes/        # HTTP method + path → controller (no logic)
├── middleware/    # authToken (JWT verification), requireRole (authorization), campaign access
├── helpers/       # Reusable queries shared across models (e.g. role/credential lookup)
├── config/        # cookieOptions, Swagger setup
├── docs/          # Swagger/OpenAPI comment blocks, one file per resource
├── scripts/       # Utilities and schema sync (sync-supabase.sql, hashExistingPasswords.js)
├── schema.sql     # Database schema (DDL)
├── db.js          # PostgreSQL connection pool
├── index.js       # Express entry point
├── .env.example
└── package.json
```

Each resource (auth, institutions, admins, campaigns, students, catalogs) follows the same three-file pattern. When adding a new one, replicate that structure instead of putting logic in `index.js`.

> **Seed data** lives in the [Database_Structure](https://github.com/Proyecto-Integrador-Riwi/Database_Structure) repository, not in this repo.

## Environment variables

Copy `backend/.env.example` to `backend/.env` and fill in the values:

| Variable | Description |
|---|---|
| `SUPABASE_DB_URL` | Connection string for the Supabase Postgres (used when `USE_LOCAL_DB=false`) |
| `USE_LOCAL_DB` | `true` to use a local Postgres; `false` to use Supabase |
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Only used when `USE_LOCAL_DB=true` |
| `PORT` | Express server port (default `3000`) |
| `JWT_SECRET` | Signing secret for access tokens |
| `JWT_EXPIRES_IN` | Access token lifetime (e.g. `1h`) |
| `JWT_REFRESH_SECRET` | Signing secret for refresh tokens (must differ from `JWT_SECRET`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (e.g. `7d`) |
| `NODE_ENV` | `production` on the deployed server (enables cross-site cookie `sameSite:none; secure`). Left unset locally (development mode) |
| `FRONTEND_URL` | URL of the deployed frontend, for CORS. Not needed locally (`localhost:5173` is already allowed) |

`.env` is gitignored and must **never** be committed. `db.js` picks the connection based on `USE_LOCAL_DB`, so switching between Supabase and a local database never requires editing committed code.

## Installation & running

```bash
cd backend
npm install
npm run dev
```

The server starts on `http://localhost:3000` and logs a database connectivity check on startup.

> To run the whole project (frontend + backend together), see the [root README](../README.md).

## Authentication & roles

Login issues two JWTs: a short-lived **access token** (sent as an `httpOnly` cookie and in the response body) and a longer-lived **refresh token** (in the body, used to obtain a new access token via `/api/auth/refresh` without re-authenticating).

| Role | Access |
|---|---|
| `superadmin` | Full: manages institutions, admins, and campaigns across the whole district |
| `administrador` | Manages students and campaigns **for their own institution** |
| `estudiante` | Views and updates their own data within the active campaigns they're eligible for |

Every protected route requires a valid access token (`authToken` middleware); role-restricted routes also use `requireRole(...)`. Scope restrictions (e.g. an admin only accessing their own institution's students) are enforced **inside the controller** using the `institution_id`/`people_id` from the token payload — **never** trusted from the client.

## API reference

Full interactive documentation (request/response schemas) is available at:

```
/api-docs        →  https://nexoedu-backend.onrender.com/api-docs
```

Quick endpoint index (Swagger is the authoritative source):

| Resource | Endpoints | Roles |
|---|---|---|
| **Auth** | `POST /api/auth/login` · `POST /api/auth/refresh` · `POST /api/auth/logout` | Public / authenticated |
| **Institutions** | `GET /api/institutions` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` | Read: authenticated · Write: superadmin |
| **Admins** | `POST /api/admins` · `PUT /:id/assign` · `DELETE /:id` | superadmin |
| **Campaigns** | `GET /api/campaigns` · `GET /mine` · `GET /:id` · `POST /` · `GET /:id/metrics` · `GET /:id/updates` · `PUT /:id/update-my-data` | Role-based (create: superadmin/administrador · update-my-data: estudiante) |
| **Students** | `GET /api/students` · `GET /:id` · `POST /` · `PUT /:id` · `DELETE /:id` · `GET /me` · `GET /:id/credentials` · `PUT /:id/credentials` · `PUT /:id/personal` · `PUT /:id/academico` | superadmin/administrador (`/me`: estudiante) |
| **Catalogs** | `GET /api/catalogs/genders` · `/document-types` · `/grades` · `/statuses` · `/localities` · `/neighborhoods` | Authenticated |

`GET /api/students` supports `?page=`, `?limit=`, and `?search=` (search by name/document).

## Backend conventions

- **Models** only run parameterized SQL (`$1`, `$2`, …) — raw input is never concatenated into a query.
- **Controllers** validate input, call the model, and map DB error codes to meaningful HTTP responses (`23505` → 409 conflict, `23503` → 404/FK violation, `23514` → 400 CHECK violation).
- **Routes** contain no logic — only method, path, middleware chain, and controller function.
- Sensitive fields used for authorization (`institution_id`, `people_id`, `credential_id`) are always read from the verified JWT payload (`req.user`), never from the request body.
- Multi-step writes that must be atomic (e.g. creating a campaign and its scope/criteria) run inside a transaction (`BEGIN`/`COMMIT`/`ROLLBACK`).

## Database

The schema is in [`schema.sql`](./schema.sql). [`scripts/`](./scripts/) holds Supabase sync utilities (`sync-supabase.sql`, idempotent) and a script to hash existing passwords.

Some business rules are enforced at the database level (not just in code):

- An institution has at most one admin credential (`UNIQUE` on `institutions.credential_id`).
- A campaign's scope is exactly one of institution, neighborhood, or locality (`CHECK`).
- A student cannot have two update rows in the same campaign (`UNIQUE uq_updates_people_campaign` on `updates`), which enables the "update my data" upsert.

## Deployment

The backend deploys to **Render** (see `render.yaml` at the root): `rootDir: backend`, build `npm install`, start `npm start`, health check at `/api/test`. Secrets (`SUPABASE_DB_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `FRONTEND_URL`) are set in the Render dashboard, never in the repo.
