# ACE Forge (`ace_forge`)

> Production-grade student weekly task management, GitHub repository inspection, and AI-assisted evaluation platform for **ACE (Advanced Computing Engineers)**.

---

## 1. Architecture Overview (Decoupled Architecture)

`ace_forge` is split into two independent, standalone tiers:

```
┌───────────────────────────────────────┐         ┌────────────────────────────────────────┐
│           Frontend (Next.js 15)       │         │        Backend API (Express + Prisma)  │
│  • App Router (Client Components)     │  REST   │  • PostgreSQL DB access (Prisma ORM)   │
│  • Visual tokens from ace-web         ├────────►│  • Google Gemini AI code evaluation    │
│  • Typed API client (src/lib/api.ts)  │  HTTP   │  • GitHub API repository inspector     │
│  • Zero Prisma / Zero DB imports      │ Cookies │  • Background AI worker & SMTP emails  │
│  • Deployed on Vercel                 │         │  • Deployed on Railway / Render / Fly  │
└───────────────────────────────────────┘         └────────────────────────────────────────┘
```

- **Frontend (`/`)**: Next.js 15 with Tailwind CSS, React 19, and `lucide-react`/`react-icons`. Interacts strictly over HTTP via `src/lib/api.ts`.
- **Backend (`/backend`)**: Node.js + Express + TypeScript service containing the Prisma schema (`backend/prisma/schema.prisma`), migrations, seed script, Gemini/GitHub integrations, and in-process background worker queue.

---

## 2. Product Features & Roles

### Portals
1. **Student Portal**:
   - Authentication with email and password. Initial password is the registered phone number, requiring a mandatory password change on first login.
   - Live dashboard with assigned module, tasks, due dates, and real-time countdown timer.
   - Weekly report submission with GitHub repository URL, detailed technical synthesis, and academic honesty declaration.
   - **Zero-knowledge security**: Student endpoints never expose internal AI marks, review comments, or faculty notes.
2. **Admin Portal**:
   - **SUPER_ADMIN**: Full platform administration, team management (inviting, editing, and deactivating faculty mentors), student management, and grading.
   - **ADMIN (Faculty Mentor)**: Manages students, batches, modules, tasks, reviews submitted reports, inspects automated AI code evaluation, and assigns official grades.
   - Server-side role enforcement on every route and API endpoint.

### Asynchronous AI Code Review
When a student submits a weekly milestone report:
1. The backend persists the report and immediately returns HTTP 201 to the client.
2. An in-process background queue (`queue.service.ts`) fetches GitHub metadata (commits, file tree, key code files) and executes Google Gemini AI evaluation (`gemini-flash-latest`) or offline heuristics.
3. The report transitions from `SUBMITTED` to `AI_REVIEWED` in the background without blocking the student UI.

### Automated Task Reminders & Overdue Tracking
- Hourly in-process `node-cron` scheduler automatically scans for day-6 pending tasks, dispatches reminder emails, and marks overdue tasks.
- Protected endpoint (`POST /api/cron/reminders` with `Bearer CRON_SECRET`) enables external webhooks or serverless cron runners.

---

## 3. Directory Layout

```
ace_forge/
├── src/                          # Next.js 15 Client Frontend
│   ├── app/                      # Next.js App Router (15 pages)
│   ├── components/               # UI components matching ace-web design system
│   ├── lib/
│   │   ├── api.ts                # Standalone typed API client (NEXT_PUBLIC_API_URL)
│   │   ├── auth-constants.ts     # Cookie names for edge middleware
│   │   └── jwt.ts                # Edge session validation
│   └── middleware.ts             # Route guard middleware
├── backend/                      # Standalone Express + Prisma API Server
│   ├── prisma/                   # Single source of truth for DB schema & migrations
│   ├── src/
│   │   ├── config/env.ts         # Zod-validated environment config
│   │   ├── routes/               # 26 REST API endpoints (auth, admin, student, cron)
│   │   ├── services/             # AI review, GitHub, email, queue, reminders
│   │   └── server.ts             # Express entrypoint & node-cron scheduler
│   ├── tests/                    # Vitest test suites (10 suites, 63 tests)
│   └── README.md                 # Detailed backend documentation
├── docs/
│   ├── BACKEND_MIGRATION.md      # API route mapping & migration specification
│   ├── DEPLOYMENT_CHECKLIST.md   # Step-by-step production deployment guide
│   └── REFERENCE_NOTES.md        # ace-web design system & stack analysis
├── next.config.ts                # Next.js configuration with development proxy rewrites
└── package.json                  # Frontend dependencies (Zero database packages)
```

---

## 4. Local Development Quickstart

### Step 1: Start the Backend Server

```bash
cd backend
npm install
cp .env.example .env
# Edit .env with your PostgreSQL credentials

# Run database migrations and seed demo data:
npx prisma migrate dev
npm run prisma:seed

# Start backend on http://localhost:4000:
npm run dev
```

Verify backend health:
```bash
curl http://localhost:4000/health
# {"status":"healthy", ...}
```

### Step 2: Start the Frontend Application

In a separate terminal at the repository root:

```bash
npm install
# Start Next.js on http://localhost:3000:
npm run dev
```

During local development, Next.js automatically rewrites `/api/*` to `http://localhost:4000`, providing seamless proxying with no CORS or cookie issues.

---

## 5. Seed Accounts for Testing

| Role | Email | Password | Details |
|---|---|---|---|
| **Super Admin** | `director@aceprogram.org` | `SuperSecretAdminPassword123!` | Full faculty and platform access |
| **Faculty Mentor** | `venkitesh@aceprogram.org` | `AdminEmployeePassword123!` | Admin role (curriculum & grading) |
| **Student 1** | `aarav@student.aceprogram.org` | `+919876543210` | Enrolled in Week 1 (requires password change) |
| **Student 2** | `diya@student.aceprogram.org` | `+919876543211` | Has submitted milestone with AI evaluation |

---

## 6. Verification & Test Commands

### Backend Tests
```bash
cd backend
npm test               # Run all 10 test suites (63 tests) via Vitest
npm run typecheck      # Typecheck TypeScript (NodeNext)
npm run build          # Compile production bundle
```

### Frontend Checks
```bash
npm run typecheck      # Frontend typecheck
npm run lint           # ESLint verification
npm run build          # Production Next.js build
```

---

## 7. Production Deployment

For complete step-by-step instructions:
- **Backend Deployment**: See [backend/README.md](file:///Users/shahidnoushad/Documents/Projects/ACE_WEB/backend/README.md) for Railway, Render, and Fly.io guides.
- **Production Checklist**: See [docs/DEPLOYMENT_CHECKLIST.md](file:///Users/shahidnoushad/Documents/Projects/ACE_WEB/docs/DEPLOYMENT_CHECKLIST.md) for Vercel, PostgreSQL, CORS, and cookie settings.
