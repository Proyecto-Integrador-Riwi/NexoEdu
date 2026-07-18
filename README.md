<div align="center">

<img src="https://img.shields.io/badge/NexoEdu-Student%20%26%20Graduate%20Tracking-2563EB?style=for-the-badge&logo=readthedocs&logoColor=white" alt="NexoEdu Banner"/>

# 🎓 NexoEdu

**A web platform for tracking and managing student and graduate information across educational institutions.**  
The system centralizes student/graduate data and keeps it current through update campaigns run by school administrators and a super administrator.

<br/>

[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-5.x-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Swagger](https://img.shields.io/badge/API%20Docs-Swagger-85EA2D?style=flat-square&logo=swagger&logoColor=black)](http://localhost:3000/api-docs)

<br/>

[Integration Status](#-current-integration-status) · [Related Repos](#-related-repositories) · [Getting Started](#-getting-started) · [Documentation](#-documentation) · [Roadmap](#%EF%B8%8F-roadmap)

</div>

---

> 📌 This is a capstone project (Proyecto Integrador). This README documents the project **as delivered for the current submission** — it is a snapshot of progress, not the final version. Sections below state clearly what is finished, what is in progress, and what is explicitly pending.

## 📁 Repository Structure

This repository (`NexoEdu`) is the intended home for the full, integrated project. Its current contents:

```
NexoEdu/
├── 🗄️  backend/     → Real REST API (Express + PostgreSQL/Supabase) — functional, documented, tested independently
├── 🎨 frontend/     → Early frontend scaffold — not the actively developed version, see note below
├── 📄 package.json  → Root orchestration scripts (installs and runs both folders together)
└── 📄 README.md
```

## 🔗 Related Repositories

The project is currently split across three repositories while each part is developed and validated independently:

| Repository | Purpose |
|---|---|
| [Database_Structure](https://github.com/Proyecto-Integrador-Riwi/Database_Structure) | PostgreSQL schema, entity-by-entity design justification, business rules, and the Supabase migration process |
| [Frontend_Structure_With_MockAPI](https://github.com/Proyecto-Integrador-Riwi/Frontend_Structure_With_MockAPI) | The actively developed frontend, currently built against a mock API so frontend work isn't blocked by backend progress |
| `NexoEdu` (this repo) | The real backend, and the eventual integration point for the whole project |

## 🔄 Current Integration Status

**The backend and frontend are not yet integrated.** They have been developed in parallel:

- ✅ The **backend** (`backend/` in this repo) is complete for the endpoints listed in its own README, tested independently via Swagger and Thunder Client against a real Supabase database.
- 🟡 The **frontend** (in the separate `Frontend_Structure_With_MockAPI` repository) is built against a mock Express server returning data from a local `db.json`, so frontend development didn't have to wait on backend endpoints.
- ⚪ The `frontend/` folder inside this repository is an earlier scaffold and does not reflect the frontend team's current, active work.

> **Next step:** point the frontend's `API_URL` at this repository's real backend, remove the mock server, and merge the frontend team's current work into this repository.

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Vanilla JavaScript (ES Modules), Vite 8, Tailwind CSS v4, custom SPA router |
| Backend | Node.js, Express 5, JWT auth, Swagger/OpenAPI docs |
| Database | PostgreSQL, hosted on Supabase |

Full details for each layer are in their respective READMEs (linked below).

## 🚀 Getting Started

### Run the backend (functional today, against the real database)

```bash
cd backend
npm install
npm run dev
```

See [`backend/README.md`](./backend/README.md) for environment variables, authentication, roles, and the full endpoint reference.

### Run the backend + the local frontend scaffold together

From the project root:

```bash
npm install          # installs concurrently
npm run install:all  # installs backend/ and frontend/ dependencies separately
npm run dev           # runs both at once
```

> ⚠️ Keep in mind this starts the `frontend/` folder in *this* repository, which — as noted above — is not the frontend team's current work.

### Run the actively developed frontend (against the mock API)

See the [Frontend_Structure_With_MockAPI](https://github.com/Proyecto-Integrador-Riwi/Frontend_Structure_With_MockAPI) repository and its own README for setup instructions.

## 📚 Documentation

- [Backend README](./backend/README.md) — architecture, environment setup, authentication/roles, endpoint reference, conventions
- [Database_Structure README](https://github.com/Proyecto-Integrador-Riwi/Database_Structure) — schema design rationale, business rules, Supabase migration
- [Frontend README](https://github.com/Proyecto-Integrador-Riwi/Frontend_Structure_With_MockAPI) — architecture, views, routes, mock API

## 🗺️ Roadmap

- [ ] Finish remaining backend work (see [Planned Improvements](./backend/README.md#planned-improvements) in the backend README: student self-service profile updates, update history tracking, dashboard/indicator endpoints, institution soft delete, password hashing).
- [ ] Merge the frontend team's current work into this repository.
- [ ] Point the frontend at the real backend API and remove the mock server.
- [ ] End-to-end integration testing across both layers.

## 👨‍💻 Team

| Name | Role |
|------|------|
| Ricardo | Scrum Master |
| Jorge | Backend |
| Daniel | Backend |
| Habith | Backend |
| Oscar | Frontend |
| Ronaldo | Frontend |

---

<div align="center">

Built for **RIWI** · Proyecto Integrador · NexoEdu

</div>
