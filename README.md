<div align="center">

<img src="https://img.shields.io/badge/NexoEDU-Student%20Tracking-2563EB?style=for-the-badge&logo=readthedocs&logoColor=white" alt="NexoEDU"/>

# 🎓 NexoEDU

**A web platform for tracking and managing student and graduate information across educational institutions.**
It centralizes student/graduate data and keeps it current through **update campaigns** run by each institution's administrators and a super administrator.

Built by RIWI coders in partnership with the **Alcaldía de Barranquilla** (Barranquilla City Hall).

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Swagger](https://img.shields.io/badge/API%20Docs-Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black)](https://nexoedu-backend.onrender.com/api-docs)

</div>

---

## 🚀 Live demo

| Service | URL |
|---|---|
| **App** (frontend) | https://nexo-edu.vercel.app |
| **API** (backend) | https://nexoedu-backend.onrender.com |
| **API docs** (Swagger) | https://nexoedu-backend.onrender.com/api-docs |

> Deployed on free tiers: the backend (Render) sleeps after ~15 min of inactivity, so the **first** request may take ~30-50 s to respond. That's expected; just retry.

## 📁 Repository structure

```
NexoEdu/
├── backend/      → REST API (Express + PostgreSQL/Supabase). See backend/README.md
├── frontend/     → Vanilla JavaScript SPA (Vite + Tailwind v4). See frontend/README.md
├── package.json  → Orchestration scripts (installs and runs both folders together)
└── README.md
```

## 🛠️ Tech stack

| Layer | Technology |
|---|---|
| **Frontend** | Vanilla JavaScript (ES Modules), Vite, Tailwind CSS v4, custom SPA router |
| **Backend** | Node.js, Express 5, JWT auth (`httpOnly` cookie), Swagger/OpenAPI |
| **Database** | PostgreSQL, hosted on Supabase |
| **Deployment** | Frontend → Vercel · Backend → Render · DB → Supabase |

## 👥 Roles

| Role | Scope |
|---|---|
| `superadmin` | Full access: manages institutions, admins, and campaigns across the whole district |
| `administrador` | Manages students and campaigns **for their own institution only** |
| `estudiante` | Views and updates their own data within the active campaigns they're eligible for |

## ⚡ Getting started (local)

Requirements: **Node.js 18+**, **npm**, and a PostgreSQL database (Supabase or a local Postgres).

```bash
# 1. Install dependencies for root + backend + frontend
npm install
npm run install:all

# 2. Configure the backend environment variables
#    Copy backend/.env.example -> backend/.env and fill it in
#    (see backend/README.md for the details of each variable)

# 3. Run backend and frontend together
npm run dev
```

By default: backend on `http://localhost:3000` and frontend on `http://localhost:5173`.

> You can also run each part separately: `npm run dev:backend` and `npm run dev:frontend`.

## 📚 Documentation

- **[Backend README](./backend/README.md)** — architecture, environment variables, auth/roles, endpoint reference, conventions.
- **[Frontend README](./frontend/README.md)** — SPA architecture, views, components, and services.
- **[Swagger](https://nexoedu-backend.onrender.com/api-docs)** — interactive API reference.
- **[Database_Structure](https://github.com/Proyecto-Integrador-Riwi/Database_Structure)** — schema design, business rules, and seed data (separate repository).

## 👨‍💻 Team

| Name | Role |
|---|---|
| Ricardo | Scrum Master |
| Jorge | Backend |
| Daniel | Backend |
| Habith | Backend |
| Oscar | Frontend |
| Ronaldo | Frontend |

---

<div align="center">

Built by **RIWI** coders · Proyecto Integrador · in partnership with the **Alcaldía de Barranquilla**

</div>

