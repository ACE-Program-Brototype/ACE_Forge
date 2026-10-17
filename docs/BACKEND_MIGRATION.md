# ACE Forge: Full-Stack Decoupling & Backend Migration Plan

This document details the architectural audit and comprehensive migration plan to split **ACE Forge** from a monolithic Next.js application into:
1. **A Standalone Backend API Server** (`backend/`): Node.js + TypeScript + Express (or Fastify), Prisma ORM, PostgreSQL, Background Workers, and scheduled jobs, deployed on **Railway / Render / Fly.io**.
2. **A Client-Only Frontend** (`/` or `apps/web/`): Next.js 15 App Router deployed on **Vercel**, communicating exclusively over HTTP via a typed API client (`src/lib/api.ts`). Zero Prisma or direct database dependencies.

---

## 1. Codebase Audit Summary

### 1.1 Server Components & Database Access Audit
- **Total Pages Audited**: 17 page files across `src/app/**`.
- **Pages Directly Accessing Prisma / Database**: **0**.
- **Client Components (`"use client"`)**: **15 / 15** interactive pages already use client-side `fetch()` against `/api/...` endpoints.
- **Static Pages**: `src/app/page.tsx` (Hero landing) and `src/app/layout.tsx` (Root typography & HTML shell) have no database dependencies.
- **Finding**: No Server-Side Rendering (SSR) page needs database decoupling. All data access is cleanly isolated to `src/app/api/**`.

### 1.2 Route & Feature Inventory
- **Total API Routes Audited**: 26 endpoints under `src/app/api/**`.
- **External Integrations Identified**:
  - **Prisma Client**: 10 models (`Admin`, `Batch`, `Module`, `Student`, `Task`, `StudentTask`, `Report`, `Feedback`, `EmailLog`).
  - **Google Gemini API**: `gemini-flash-latest` (with 503 backoff retry and heuristic fallback).
  - **Anthropic Claude API**: `claude-3-5-sonnet-20241022` (secondary fallback).
  - **GitHub REST API**: Repository inspection (commits, file tree, readme, code sampling).
  - **Nodemailer**: SMTP email delivery with dev-mode console logging (`EmailType.WELCOME`, `EmailType.REMINDER_DAY6`).
  - **JWT & Session Security**: `jose` (HS256) with `httpOnly` secure cookies (`ace_admin_token`, `ace_student_token`).
  - **In-Memory Rate Limiting**: Leaky-bucket / sliding-window IP + email brute-force throttling.

---

## 2. Route-by-Route Mapping

All 26 Next.js App Router API routes map directly to RESTful endpoints on the standalone backend:

| # | Existing Next.js Route | Method | New Backend Route | Auth / Role Guard | Description & External Services |
|---|---|---|---|---|---|
| **Auth** | | | | | |
| 1 | `/api/auth/admin/login` | `POST` | `/api/auth/admin/login` | Public (Rate Limited) | Validates credentials, compares bcrypt hash, signs JWT, sets `ace_admin_token` cookie. |
| 2 | `/api/auth/admin/logout` | `POST` | `/api/auth/admin/logout` | Public | Clears `ace_admin_token` cookie. |
| 3 | `/api/auth/student/login` | `POST` | `/api/auth/student/login` | Public (Rate Limited) | Validates credentials, verifies student status, signs JWT, sets `ace_student_token` cookie. |
| 4 | `/api/auth/student/logout` | `POST` | `/api/auth/student/logout` | Public | Clears `ace_student_token` cookie. |
| 5 | `/api/auth/student/change-password` | `POST` | `/api/auth/student/change-password` | `STUDENT` | Validates old password, hashes new password, sets `mustChangePassword: false`, re-signs JWT. |
| 6 | `/api/auth/me` | `GET` | `/api/auth/me` | Public (Session reader) | Reads current session cookie, returns authenticated admin or student profile. |
| **Admin: Dashboard & Team** | | | | | |
| 7 | `/api/admin/dashboard/stats` | `GET` | `/api/admin/dashboard/stats` | `ADMIN` or `SUPER_ADMIN` | Aggregates counts (students, active students, open tasks, submitted reports, overdue tasks). |
| 8 | `/api/admin/team` | `GET` | `/api/admin/team` | `SUPER_ADMIN` only | Lists all employee admins and super admins. |
| 9 | `/api/admin/team` | `POST` | `/api/admin/team` | `SUPER_ADMIN` only | Creates new admin, generates temporary password, sends invitation email via Nodemailer. |
| 10 | `/api/admin/team/[id]` | `PATCH` | `/api/admin/team/:id` | `SUPER_ADMIN` only | Toggles admin `isActive` status. |
| **Admin: Batches, Modules & Tasks** | | | | | |
| 11 | `/api/admin/batches` | `GET` | `/api/admin/batches` | `ADMIN` | Lists batches with student counts. |
| 12 | `/api/admin/batches` | `POST` | `/api/admin/batches` | `ADMIN` | Creates new student cohort batch. |
| 13 | `/api/admin/batches/[id]` | `GET` | `/api/admin/batches/:id` | `ADMIN` | Retrieves batch details. |
| 14 | `/api/admin/batches/[id]` | `PUT` | `/api/admin/batches/:id` | `ADMIN` | Updates batch name, startDate, or status. |
| 15 | `/api/admin/batches/[id]` | `DELETE` | `/api/admin/batches/:id` | `ADMIN` | Deletes batch (blocked if students enrolled). |
| 16 | `/api/admin/modules` | `GET` | `/api/admin/modules` | `ADMIN` | Lists modules ordered by `orderIndex` with tasks and student counts. |
| 17 | `/api/admin/modules` | `POST` | `/api/admin/modules` | `ADMIN` | Creates new curriculum module. |
| 18 | `/api/admin/modules/[id]` | `GET` | `/api/admin/modules/:id` | `ADMIN` | Retrieves module details with associated tasks. |
| 19 | `/api/admin/modules/[id]` | `PUT` | `/api/admin/modules/:id` | `ADMIN` | Updates module name, orderIndex, description. |
| 20 | `/api/admin/modules/[id]` | `DELETE` | `/api/admin/modules/:id` | `ADMIN` | Deletes module (blocked if students active). |
| 21 | `/api/admin/tasks` | `POST` | `/api/admin/tasks` | `ADMIN` | Creates new task under module; auto-assigns `StudentTask` to all active students in module. |
| 22 | `/api/admin/tasks/[id]` | `GET` | `/api/admin/tasks/:id` | `ADMIN` | Retrieves task details and student assignment status list. |
| 23 | `/api/admin/tasks/[id]` | `PUT` | `/api/admin/tasks/:id` | `ADMIN` | Updates task title, description, referenceLink, isActive. |
| 24 | `/api/admin/tasks/[id]` | `DELETE` | `/api/admin/tasks/:id` | `ADMIN` | Deactivates or removes task. |
| **Admin: Student Management** | | | | | |
| 25 | `/api/admin/students` | `GET` | `/api/admin/students` | `ADMIN` | Search & filter students (batch, module, status). |
| 26 | `/api/admin/students` | `POST` | `/api/admin/students` | `ADMIN` | Manually creates student, assigns module tasks, sends welcome email. |
| 27 | `/api/admin/students/[id]` | `GET` | `/api/admin/students/:id` | `ADMIN` | Full student profile, assigned tasks, reports, and marks history. |
| 28 | `/api/admin/students/[id]` | `PATCH` | `/api/admin/students/:id` | `ADMIN` | Updates student profile, batch, or module (triggers task reassignment). |
| 29 | `/api/admin/students/[id]` | `DELETE` | `/api/admin/students/:id` | `ADMIN` | Supports soft-deactivation OR `?permanent=true` cascading deletion. |
| 30 | `/api/admin/students/import` | `POST` | `/api/admin/students/import` | `ADMIN` | Parses XLSX/CSV, validates rows, bulk creates students in batches, sends welcome emails. |
| 31 | `/api/admin/active-students` | `GET` | `/api/admin/active-students` | `ADMIN` | Lists students currently holding open tasks with countdown and earliest due date. |
| **Admin: Reports & Grading** | | | | | |
| 32 | `/api/admin/reports` | `GET` | `/api/admin/reports` | `ADMIN` | Lists reports with filters (batch, status, studentTaskId). |
| 33 | `/api/admin/reports/[id]` | `GET` | `/api/admin/reports/:id` | `ADMIN` | Detailed report view: student work, GitHub snapshot, AI review, and employee marks. |
| 34 | `/api/admin/reports/[id]/grade` | `POST` | `/api/admin/reports/:id/grade` | `ADMIN` | Upserts `FeedbackType.EMPLOYEE`, sets final marks, marks `StudentTask` as `REVIEWED`. |
| **Student Portal** | | | | | |
| 35 | `/api/student/dashboard` | `GET` | `/api/student/dashboard` | `STUDENT` | Current module, assigned tasks, due dates, countdowns, submission statuses (no marks). |
| 36 | `/api/student/tasks/[id]` | `GET` | `/api/student/tasks/:id` | `STUDENT` | Task description, reference link, and student's submitted report. |
| 37 | `/api/student/reports` | `POST` | `/api/student/reports` | `STUDENT` | Validates repo URL & AI declaration, creates `Report`, updates `StudentTask` to `SUBMITTED`, enqueues background AI review worker, returns immediately. |
| **Scheduled Jobs & Health** | | | | | |
| 38 | `/api/cron/reminders` | `POST`, `GET` | `/api/cron/reminders` | Protected (`Bearer CRON_SECRET`) | Checks day-6 reminder candidates, sends reminder emails, flags overdue tasks. |
| 39 | *New* | `GET` | `/health` | Public | Healthcheck endpoint reporting server uptime, DB connectivity status, and version. |

---

## 3. Code Allocation & Shared Modules

```
ace_forge/
├── backend/                      # STANDALONE API SERVER (Railway/Render)
│   ├── package.json              # Express, @prisma/client, cors, helmet, etc.
│   ├── tsconfig.json
│   ├── .env.example
│   ├── prisma/
│   │   ├── schema.prisma         # SINGLE SOURCE OF TRUTH FOR DATABASE
│   │   ├── migrations/
│   │   └── seed.ts
│   ├── src/
│   │   ├── server.ts             # Express entry point, helmet, CORS, healthcheck
│   │   ├── config/env.ts         # Server env validation with Zod
│   │   ├── routes/               # Express routers (auth, admin, student, cron)
│   │   ├── middleware/           # auth.ts, rate-limiter.ts, errorHandler.ts
│   │   ├── services/
│   │   │   ├── ai-review.service.ts
│   │   │   ├── github.service.ts
│   │   │   ├── email.service.ts
│   │   │   ├── reminder.service.ts
│   │   │   ├── task-assignment.service.ts
│   │   │   └── queue.service.ts  # In-process async review worker
│   │   ├── validators/           # Zod schemas (shared or mirrored)
│   │   └── lib/
│   │       ├── prisma.ts         # PrismaClient singleton
│   │       └── jwt.ts            # Token signing & verification
│   └── tests/                    # Vitest unit/integration tests for backend logic
│
└── src/ (or frontend/)           # CLIENT-ONLY NEXT.JS APP (Vercel)
    ├── src/
    │   ├── lib/
    │   │   └── api.ts            # Typed HTTP API client replacing direct fetch & DB
    │   ├── middleware.ts         # Client edge route protection & redirects
    │   ├── validators/           # Form validation schemas
    │   ├── components/           # UI components
    │   └── app/                  # Next.js App Router (pages only, NO /api routes)
    ├── package.json              # Removed @prisma/client, prisma, nodemailer
    └── next.config.ts            # Optional proxy rewrite or direct CORS target
```

### Shared vs Relocated Code
1. **Prisma Schema & Migrations**: Move completely to `backend/prisma/`. The frontend will not install `@prisma/client`.
2. **Services (`src/services/*`)**: Move completely to `backend/src/services/`.
3. **Email Delivery (`src/lib/email.ts`)**: Move to `backend/src/services/email.service.ts`.
4. **AI Review Engine (`src/services/ai-review.service.ts`)**: Move to backend.
5. **Rate Limiting (`src/lib/rate-limiter.ts`)**: Move to backend middleware (`express-rate-limit` or existing memory tracker).
6. **Validators (`src/validators/*`)**: Retained in frontend for client-side form validation before dispatch, and mirrored in backend for strict server-side validation.

---

## 4. Environment Variables Breakdown

### 4.1 Backend Server (`backend/.env`)
These secrets live **strictly on Railway/Render** and are never exposed to Vercel or client browsers:

```ini
# Server Configuration
PORT=4000
NODE_ENV=production
CORS_ORIGIN="http://localhost:3000,https://ace-forge.vercel.app"

# Database
DATABASE_URL="postgresql://user:password@host:5432/ace_forge?sslmode=require"

# JWT Authentication
JWT_SECRET="super-secure-production-jwt-secret-min-32-chars"
JWT_EXPIRES_IN="7d"

# Cron Protection
CRON_SECRET="secure-cron-authorization-secret"

# Initial Super Admin Seed Credentials
SUPER_ADMIN_NAME="ACE Director"
SUPER_ADMIN_EMAIL="director@aceprogram.org"
SUPER_ADMIN_PASSWORD="SuperSecretAdminPassword123!"

# Application Base URL (Used in email template hyperlinks)
APP_BASE_URL="https://ace-forge.vercel.app"

# Email Configuration (Nodemailer)
EMAIL_DEV_MODE="false"
SMTP_HOST="smtp.mailtrap.io"
SMTP_PORT=587
SMTP_USER="smtp-username"
SMTP_PASS="smtp-password"
EMAIL_FROM="ACE Forge <noreply@aceprogram.org>"

# AI Providers
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-flash-latest"
ANTHROPIC_API_KEY=""
ANTHROPIC_MODEL="claude-3-5-sonnet-20241022"

# GitHub REST API
GITHUB_TOKEN="ghp_..."
```

### 4.2 Frontend Application (`.env.local` / Vercel Environment)
The frontend requires only public configuration:

```ini
# Backend API Base URL
NEXT_PUBLIC_API_URL="https://ace-forge-api.railway.app"

# Optional: JWT Secret if Next.js edge middleware decodes tokens locally
# (If using backend session verification, this can also be omitted)
JWT_SECRET="super-secure-production-jwt-secret-min-32-chars"
```

---

## 5. Architectural Risks & Mitigation Strategies

### 5.1 Cross-Origin Cookies & CORS
* **The Risk**: Frontend on Vercel (`ace-forge.vercel.app`) and Backend on Railway (`ace-forge-api.railway.app`) reside on different domains. Standard browsers block third-party cookies if not properly configured.
* **Mitigation Strategy**:
  1. **Strict CORS**: The backend uses `cors({ origin: [process.env.FRONTEND_URL], credentials: true })`.
  2. **Cookie Attributes**:
     - `SameSite=None; Secure=true; HttpOnly=true; Path=/;` in production.
     - `SameSite=Lax; Secure=false;` in local development (`localhost`).
  3. **Alternative Zero-CORS Architecture (Recommended for Custom Domains)**:
     If the user configures a custom domain (e.g., `app.aceforge.org` and `api.aceforge.org`), cookies can use `Domain=.aceforge.org; SameSite=Lax`.
     Alternatively, Next.js `next.config.ts` can rewrite `/api/:path*` to `${BACKEND_URL}/api/:path*`, allowing all cookies to remain first-party to Vercel without cross-origin friction.

### 5.2 Next.js `middleware.ts` Authentication Redirects
* **The Risk**: If the backend sets a cookie on `railway.app`, a direct browser navigation to `vercel.app/dashboard` will not send that cookie to the Vercel edge runtime unless proxied or using custom domain scoping.
* **Mitigation Strategy**:
  1. Next.js `src/lib/api.ts` handles API authentication via `credentials: "include"`.
  2. For client-side route transitions, pages check session via `apiClient.get('/api/auth/me')` or a lightweight React Auth Context.
  3. If using Next.js `rewrites()` in `next.config.ts`, `middleware.ts` continues to receive the first-party cookie seamlessly and decodes it via `jose` with zero DB calls.

### 5.3 Asynchronous AI Review & Long-Running Requests
* **The Risk**: GitHub REST API inspections and Gemini LLM evaluations can take 5–15 seconds. If run in the HTTP request cycle, serverless gateways will time out.
* **Mitigation Strategy**:
  1. `POST /api/student/reports` saves the report with status `SUBMITTED` and commits the transaction immediately (< 100ms).
  2. The endpoint pushes a job to an in-process asynchronous review queue (`QueueService`).
  3. The queue worker handles GitHub fetching, backoff retries, Gemini evaluation, and status updates to `AI_REVIEWED`.
  4. The frontend UI displays an animated review badge and refetches or polls report status upon viewing.

### 5.4 Bulk Import Timeouts
* **The Risk**: Uploading an Excel file with 200+ students running password hashing, DB insertion, module task generation, and welcome emails can exceed standard HTTP 30s timeouts.
* **Mitigation Strategy**:
  1. Backend processes the spreadsheet in chunks of 25.
  2. Welcome emails are dispatched asynchronously via the background worker queue so password hashing and student creation return within a few seconds with row-by-row import results.

### 5.5 Scheduled Reminders & Overdue Transitions
* **The Risk**: Vercel cron has execution limits and serverless runtime timeouts.
* **Mitigation Strategy**:
  1. Use `node-cron` directly inside the persistent backend process (`cron.schedule('0 * * * *', runRemindersJob)`).
  2. Also expose `POST /api/cron/reminders` protected by `Authorization: Bearer <CRON_SECRET>` so external schedulers (CronJob.org, Railway cron, GitHub Actions) can trigger it on demand.

---

## 6. Implementation Phases (Post-Approval)

- **Phase 1: Backend Scaffolding**: Setup `backend/` with Express, TypeScript, Zod, Helmet, CORS, and migrate `prisma/` as the single source of truth.
- **Phase 2: Backend Core Services & Auth**: Implement JWT verification, cookie handling, rate limiting, and all 6 auth routes.
- **Phase 3: Admin & Student API Routes**: Port all student, batch, module, task, and report endpoints.
- **Phase 4: Async AI Review Queue & Scheduled Reminders**: Implement in-process queue worker and `node-cron` reminder scheduler.
- **Phase 5: Frontend Decoupling**: Create `src/lib/api.ts`, replace all relative `fetch` calls across all pages, remove `@prisma/client` from frontend `package.json`, and verify Next.js builds cleanly without DB access.
- **Phase 6: Integration Testing & Verification**: Run backend test suite, test end-to-end report review and grading, verify `/health`, and prepare Pull Request.

---
*Awaiting user approval before code implementation.*
