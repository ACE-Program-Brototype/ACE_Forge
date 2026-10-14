# ACE Forge (`ace_forge`)

> Production-grade student weekly task management, GitHub repository inspection, and AI-assisted evaluation platform for **ACE (Advanced Computing Engineers)**.

---

## 1. Product Overview

`ace_forge` is an engineering cohort evaluation platform designed with two distinct sides:
1. **Student Portal**:
   - Students authenticate with email and password.
   - Enforces a mandatory password change on first login (initial temporary password is their registered phone number).
   - Real-time dashboard presenting current cohort module, assigned tasks, due dates, and a live countdown timer.
   - Weekly report submission with GitHub repository link, detailed learnings synthesis, and a **mandatory academic honesty declaration** acknowledging immediate disqualification if work is found to be AI-generated or plagiarized.
   - **Zero-knowledge security**: Students never see any internal AI feedback or employee marks.
2. **Admin Portal**:
   - **SUPER_ADMIN**: Full administrative control, team faculty management (inviting and deactivating other admins and super admins), curriculum management, student management, and grading.
   - **ADMIN (Employee / Mentor)**: Manages students, batches, modules, tasks, reviews submitted reports, inspects automated AI code evaluation, and assigns official grades. Cannot create administrators.
   - Robust server-side role authorization guards on every route and API endpoint.

---

## 2. Architecture & Design System

The system adopts the visual styling, typography, and palette of the `ace-web` reference portal:
- **Framework**: Next.js 15 (App Router, TypeScript)
- **Database & ORM**: PostgreSQL with Prisma ORM
- **Visual Design System**:
  - Primary: ACE Navy (`#002C5F`), Dark (`#001F43`), Soft (`#EEF3F9`)
  - Accent: ACE Amber (`#FCAC04`), Hover (`#E59B00`), Container (`#FFF5E0`)
  - Backgrounds: Surface (`#f9f9fb`), Cards (`#ffffff`), Borders (`#D4D8E2`)
  - Typography: Serif headlines (`Playfair Display`, `Georgia`), Sans body (`Inter`, `Geist`)
- **Authentication**: Secure HTTP-only JWT sessions (`jose`), salted `bcryptjs` password hashing, in-memory rate limiting, and route protection middleware.
- **Email Service**: Nodemailer integration with dev mode (`EMAIL_DEV_MODE=true` logs to console and database table `EmailLog`) and SMTP production delivery.
- **AI Code Review**: Google Gemini API (`gemini-flash-latest`) with structured JSON schema evaluation, Anthropic Claude fallback support, and an offline heuristic engine.
- **GitHub Integration**: GitHub REST API client fetching repository metadata, commit histories, file tree structure, and key source code files with size limits.

---

## 3. Environment Variables Reference

| Variable | Description | Default / Example | Required |
|---|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/ace_forge` | Yes |
| `JWT_SECRET` | Secret key for signing session tokens | `32+ random characters string` | Yes |
| `JWT_EXPIRES_IN` | Session token lifetime | `7d` | No |
| `SUPER_ADMIN_NAME` | Initial root super admin name for database seed | `ACE Director` | No |
| `SUPER_ADMIN_EMAIL` | Initial root super admin login email | `director@aceprogram.org` | No |
| `SUPER_ADMIN_PASSWORD` | Initial root super admin login password | `SuperSecretAdminPassword123!` | No |
| `APP_BASE_URL` | Application base URL | `http://localhost:3000` | Yes |
| `EMAIL_DEV_MODE` | If `true`, logs emails to console & `EmailLog` instead of SMTP | `true` | No |
| `SMTP_HOST` | Outgoing SMTP server hostname | `smtp.mailtrap.io` | In production |
| `SMTP_PORT` | SMTP port | `587` | In production |
| `SMTP_USER` | SMTP username | `username` | In production |
| `SMTP_PASS` | SMTP password | `password` | In production |
| `EMAIL_FROM` | Sender display name and address | `ACE Forge <noreply@aceprogram.org>` | Yes |
| `GEMINI_API_KEY` | Google Gemini API key / token for AI code review | `AIzaSy...` | Optional (falls back to heuristic engine) |
| `GEMINI_MODEL` | Google Gemini model name | `gemini-flash-latest` | No |
| `ANTHROPIC_API_KEY` | Anthropic Claude API key (optional legacy fallback) | `sk-ant-...` | Optional |
| `ANTHROPIC_MODEL` | Anthropic Claude model name | `claude-3-5-sonnet-20241022` | No |
| `GITHUB_TOKEN` | Optional GitHub Personal Access Token (for higher rate limits) | `ghp_...` | Optional |

---

## 4. Getting Started & Installation

### Prerequisites
- **Node.js**: `v18.0.0` or higher (tested on `v24.18.0`)
- **PostgreSQL**: `v14` or higher (running on `localhost:5432`)
- **npm**: `v9` or higher

### Installation Steps

1. **Clone the repository and install dependencies**:
   ```bash
   git clone <repo-url> ace_forge
   cd ace_forge
   npm install
   ```

2. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and verify your PostgreSQL connection:
   ```bash
   cp .env.example .env
   ```

3. **Run Database Migrations**:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Seed Database with Demo Data**:
   Populates initial super admin, employee admin, cohort batches, weekly modules, tasks, enrolled demo students, and sample submissions:
   ```bash
   npm run prisma:seed
   ```

5. **Start the Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 5. Seed Demo Accounts

| Portal | Email | Password | Role / Notes |
|---|---|---|---|
| **Super Admin** | `director@aceprogram.org` | `SuperSecretAdminPassword123!` | SUPER_ADMIN (team management enabled) |
| **Faculty Mentor** | `venkitesh@aceprogram.org` | `AdminEmployeePassword123!` | ADMIN (curriculum & grading enabled) |
| **Candidate 1** | `aarav@student.aceprogram.org` | `+919876543210` | STUDENT (initial password is phone number; prompts password change on first login) |
| **Candidate 2** | `diya@student.aceprogram.org` | `+919876543211` | STUDENT (has demo submitted report with AI evaluation) |
| **Candidate 3** | `rohan@student.aceprogram.org` | `+919876543212` | STUDENT (enrolled in Week 2) |

---

## 6. Scheduled Jobs & Automation

### Automated Day-6 Reminder & Overdue Job
A scheduled job finds tasks with status `ASSIGNED` where:
- `assignedAt + 6 days` has passed, no reminder has been sent, and no report submitted.
- Sends an urgent 24-hour reminder email and sets `reminderSentAt` (strictly idempotent).
- Marks tasks `OVERDUE` once `dueAt` has elapsed without submission.

To trigger manually via CLI:
```bash
npm run cron:reminders
```
Or via HTTP endpoint (suitable for cron services like Vercel Cron or GitHub Actions):
```bash
curl -X POST http://localhost:3000/api/cron/reminders
```

---

## 7. Testing, Linting & Typechecking

Run the comprehensive unit and integration test suite:
```bash
# Run Vitest test suite
npm run test

# Typecheck TypeScript
npm run typecheck

# Lint Next.js & React
npm run lint

# Production build
npm run build
```

---

## 8. Key Architectural & Security Decisions

1. **Separation of Concerns**:
   - `src/lib/auth.ts`: Server-only session extraction and role gates.
   - `src/services/`: Pure business logic (`task-assignment`, `reminder`, `github`, `ai-review`).
   - `src/validators/`: Zod schemas validating client forms and API endpoints.
   - `src/components/`: Pure presentation layer matching `ace-web` tokens without embedded business logic.
2. **Confidentiality of Grading**:
   - Under no circumstances does `/api/student/*` return AI feedback scores, comments, or employee marks. Feedback is stored exclusively for administrative and mentoring calibration.
3. **Idempotent Automation**:
   - Reminders record timestamps on the `StudentTask` table to prevent duplicate emails across multiple cron runs.
4. **Heuristic AI Fallback**:
   - When a Gemini (or Anthropic) API key is not supplied, the platform falls back to a structural heuristic engine that inspects commits, README existence, and repo accessibility, enabling fully offline evaluation and automated testing.

