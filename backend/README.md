# ACE Forge Backend API Server

> Standalone Node.js + Express + Prisma REST API server for **ACE Forge**.  
> Exclusively manages PostgreSQL persistence, Google Gemini AI code evaluation, GitHub repository analysis, SMTP email dispatch, and scheduled task reminders.

---

## Architecture & Responsibilities

- **Framework**: Express 4 with TypeScript (NodeNext / ES2022)
- **Database & ORM**: PostgreSQL with Prisma ORM (`prisma/schema.prisma` is the single source of truth)
- **Authentication**: JWT signed via `jose`, stored in `httpOnly` secure cookies (`ace_admin_token`, `ace_student_token`)
- **Background Worker**: In-process asynchronous job queue (`queue.service.ts`) for non-blocking Gemini AI evaluations upon report submission
- **Scheduled Cron**: Hourly in-process `node-cron` scheduler + protected HTTP endpoint (`POST /api/cron/reminders` with `Bearer CRON_SECRET`)
- **Logging & Observability**: Production-grade Winston logger with correlation IDs (`X-Request-Id`), sensitive data redaction, single-line JSON formatting for aggregators, and human-friendly color output in dev
- **Security & Headers**: Helmet, CORS with strict origin allowlist and `credentials: true`, rate limiting (`express-rate-limit`)

---

## Directory Structure

```
backend/
├── prisma/
│   ├── schema.prisma           # Canonical database schema & indexes
│   ├── seed.ts                 # Database seed (root super admin & initial modules)
│   └── migrations/             # SQL migration files
├── src/
│   ├── config/env.ts           # Zod-validated runtime environment configuration
│   ├── lib/
│   │   ├── prisma.ts           # Global PrismaClient singleton
│   │   ├── jwt.ts              # Jose token issuance & verification
│   │   └── logger.ts           # Winston logger with sensitive redaction
│   ├── middleware/
│   │   ├── auth.ts             # requireAdmin & requireStudent guards
│   │   ├── errorHandler.ts     # Centralized HTTP error handler with request ID
│   │   ├── request-logger.ts   # HTTP request timing & correlation middleware
│   │   └── rate-limiter.ts     # Auth and general rate limiters
│   ├── routes/
│   │   ├── admin.routes.ts     # Admin CRUD (students, batches, modules, tasks, reports)
│   │   ├── auth.routes.ts      # Login, logout, /me, student password change
│   │   ├── cron.routes.ts      # Protected bearer-authenticated reminder job
│   │   └── student.routes.ts   # Student dashboard, tasks, non-blocking report submission
│   ├── services/
│   │   ├── ai-review.service.ts # Google Gemini API + offline heuristic fallback
│   │   ├── email.service.ts     # Nodemailer SMTP with dev mode console logger
│   │   ├── github.service.ts    # GitHub REST API client & AST snapshot builder
│   │   ├── queue.service.ts     # Background worker for AI evaluations
│   │   ├── reminder.service.ts  # Day 6 reminder emails & overdue status transitions
│   │   └── task-assignment.service.ts # Module-to-student task auto-assigner
│   ├── validators/             # Zod input validation schemas
│   └── server.ts               # Express application entrypoint & server bootstrap
├── tests/                      # Vitest test suites (16 test suites, 119 unit tests)
├── .env.example
├── package.json
└── tsconfig.json
```

---

## Environment Variables Reference

Copy `.env.example` to `.env` in the `backend/` directory:

| Variable | Description | Example / Default | Required |
|---|---|---|---|
| `PORT` | HTTP server port | `4000` | No |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@localhost:5432/ace_forge` | **Yes** |
| `LOG_LEVEL` | Minimum log severity level (`error`, `warn`, `info`, `http`, `debug`) | `info` (or `error` during tests) | No |
| `LOG_FORMAT` | Log format strategy (`json` or `pretty`) | `pretty` in dev, `json` in prod | No |
| `JWT_SECRET` | Secret key for JWT signing (HS256) | `minimum-32-character-random-secret` | **Yes** |
| `JWT_EXPIRES_IN` | Token expiration duration | `7d` | No |
| `CORS_ORIGIN` | Allowed frontend origin(s), comma-separated | `http://localhost:3000,https://app.aceforge.org` | **Yes** |
| `COOKIE_DOMAIN` | Optional cookie domain (e.g. `.aceforge.org`) | `localhost` | No |
| `COOKIE_SAME_SITE` | Cookie SameSite policy (`lax`, `none`, `strict`) | `lax` (use `none` for cross-site) | No |
| `COOKIE_SECURE` | Whether cookies require HTTPS | `false` in dev, `true` in prod | No |
| `CRON_SECRET` | Secret token to invoke `POST /api/cron/reminders` | `custom-cron-token-xyz` | Recommended |
| `GEMINI_API_KEY` | Google Gemini API key for automated reviews | `AIzaSy...` | Optional (falls back to heuristic) |
| `GEMINI_MODEL` | Gemini model name | `gemini-flash-latest` | No |
| `GITHUB_TOKEN` | Optional GitHub PAT for higher API rate limits | `ghp_...` | No |
| `EMAIL_DEV_MODE` | If `true`, logs emails to stdout & database | `true` | No |
| `SMTP_HOST` | Outgoing SMTP server hostname | `smtp.mailtrap.io` | In production |
| `SMTP_PORT` | Outgoing SMTP server port | `587` | In production |
| `SMTP_USER` | SMTP username | `username` | In production |
| `SMTP_PASS` | SMTP password | `password` | In production |
| `EMAIL_FROM` | Sender display name and address | `ACE Forge <noreply@aceforge.org>` | **Yes** |

---

## Local Development Quickstart

1. **Install dependencies**:
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment**:
   ```bash
   cp .env.example .env
   # Edit .env with your local PostgreSQL credentials
   ```

3. **Run database migrations and seed**:
   ```bash
   npx prisma migrate dev
   npm run prisma:seed
   ```

4. **Start the development server with live reload**:
   ```bash
   npm run dev
   ```
   The backend will be live at `http://localhost:4000`.

5. **Verify health check**:
   ```bash
   curl http://localhost:4000/health
   # Returns: {"status":"healthy","timestamp":"...","uptime":...}
   ```

6. **Run tests**:
   ```bash
   npm test
   ```

---

## Deployment Instructions

### 1. Railway Deployment

1. Create a new project in [Railway](https://railway.app).
2. Add a **PostgreSQL** database service. Note the connection string (`DATABASE_URL`).
3. Add a new **GitHub Repo** service pointing to your repository, with root directory set to `backend`.
4. In Railway project settings, configure the environment variables:
   - `DATABASE_URL`: `${Postgres.DATABASE_URL}`
   - `JWT_SECRET`: Generate a secure random string (`openssl rand -base64 32`)
   - `CORS_ORIGIN`: Your Vercel frontend URL (e.g. `https://ace-forge.vercel.app`)
   - `COOKIE_SAME_SITE`: `none`
   - `COOKIE_SECURE`: `true`
   - `CRON_SECRET`: Generate a random token
   - `EMAIL_DEV_MODE`: `false` (with SMTP variables provided)
   - `GEMINI_API_KEY`: Your Gemini API key
5. Build & Start Commands:
   - **Build Command**: `npm install && npx prisma migrate deploy && npm run build`
   - **Start Command**: `npm start`

### 2. Render Deployment

1. Create a **Web Service** on [Render](https://render.com) linked to your repo.
2. Set **Root Directory** to `backend`.
3. Set **Environment** to `Node`.
4. Configure Build and Start commands:
   - **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
   - **Start Command**: `npm start`
5. Attach a Render PostgreSQL database or paste external `DATABASE_URL`.
6. Add environment variables according to the table above.
7. Set health check path to `/health`.

### 3. Fly.io Deployment

1. Install Fly CLI: `brew install flyctl`
2. In `backend/`:
   ```bash
   fly launch
   fly secrets set DATABASE_URL="..." JWT_SECRET="..." CORS_ORIGIN="https://..."
   fly deploy
   ```
