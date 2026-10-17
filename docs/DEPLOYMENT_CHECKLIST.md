# 🚀 Production Deployment Checklist: ACE Forge

> Two-tier decoupled architecture: **Next.js 15 Client Frontend (Vercel)** and **Express + Prisma Backend API (Railway / Render / Fly.io)** with **PostgreSQL**.

---

## 🏗️ Architecture Topology

```
                  ┌──────────────────────────────────────────────────┐
                  │                 Browser Client                   │
                  └─────────┬──────────────────────────────┬─────────┘
                            │                              │
         Static Pages & UI  │                              │ REST API Calls & Cookies
                            ▼                              ▼
                 ┌────────────────────┐         ┌─────────────────────────┐
                 │ Frontend (Vercel)  │ ◄───────┤ Backend (Railway/Render)│
                 │ Next.js 15 App     │ rewrites│ Express + Prisma        │
                 └────────────────────┘         └────────────┬────────────┘
                                                             │
                                   ┌─────────────────────────┼─────────────────────────┐
                                   ▼                         ▼                         ▼
                        ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐
                        │    PostgreSQL    │      │ Google Gemini AI │      │   SMTP Mailer    │
                        │ (Neon/Supabase)  │      │   & GitHub API   │      │ (Resend/Sendgrid)│
                        └──────────────────┘      └──────────────────┘      └──────────────────┘
```

---

## 📋 1. Backend Deployment (Railway / Render / Fly.io)

### Pre-Deployment Verification
- [ ] Run test suite locally from `backend/`: `npm test` (all 63 tests must pass).
- [ ] Run typecheck and build from `backend/`: `npm run typecheck && npm run build`.

### Environment Configuration
Configure these environment variables in your backend service dashboard:

| Variable | Recommended Production Setting |
|---|---|
| `PORT` | Set automatically by platform or `4000` |
| `DATABASE_URL` | Cloud PostgreSQL pooled connection string (Neon, Supabase, Railway) |
| `JWT_SECRET` | 32+ char cryptographic random string (`openssl rand -base64 32`) |
| `JWT_EXPIRES_IN` | `7d` |
| `CORS_ORIGIN` | `https://your-frontend-domain.vercel.app` (or custom domain) |
| `COOKIE_SECURE` | `true` |
| `COOKIE_SAME_SITE` | `none` (if frontend & backend have different domains) or `lax` (if same origin/proxy) |
| `COOKIE_DOMAIN` | Leave blank unless using shared wildcard subdomain (e.g. `.aceforge.org`) |
| `CRON_SECRET` | 32+ char secret token to invoke scheduled reminders |
| `EMAIL_DEV_MODE` | `false` |
| `SMTP_HOST` | Production SMTP hostname (e.g. `smtp.resend.com` or `smtp.sendgrid.net`) |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Production SMTP username |
| `SMTP_PASS` | Production SMTP password / API token |
| `EMAIL_FROM` | `ACE Forge <notifications@aceforge.org>` |
| `GEMINI_API_KEY` | Google Gemini API key (generates automated student code evaluations) |
| `GEMINI_MODEL` | `gemini-flash-latest` |
| `GITHUB_TOKEN` | Optional GitHub Personal Access Token (prevents rate limiting on repo inspection) |

### Build & Start Commands
- **Root Directory**: `backend`
- **Build Command**: `npm install && npx prisma generate && npx prisma migrate deploy && npm run build`
- **Start Command**: `npm start`
- **Health Check Path**: `/health`

### Initial Database Migration & Seeding
Once the backend container connects to PostgreSQL:
```bash
# In backend/ or via Railway/Render CLI shell:
npx prisma migrate deploy
npm run prisma:seed
```
*Creates initial Super Admin (`director@aceprogram.org`) and core cohort modules.*

---

## 📋 2. Frontend Deployment (Vercel)

### Pre-Deployment Verification
- [ ] Run frontend typecheck: `npm run typecheck`.
- [ ] Run frontend linter: `npm run lint`.
- [ ] Run frontend build: `npm run build`.

### Vercel Project Setup
1. Import repository on [Vercel](https://vercel.com).
2. Set **Root Directory** to `./` (repository root).
3. Framework Preset: **Next.js**.

### Environment Configuration
Configure these environment variables in the Vercel dashboard:

| Variable | Setting |
|---|---|
| `NEXT_PUBLIC_API_URL` | `https://your-backend-api.up.railway.app` |
| `BACKEND_API_URL` | `https://your-backend-api.up.railway.app` (used by Next.js rewrites proxy) |
| `JWT_SECRET` | Same `JWT_SECRET` as backend (for Edge middleware session checks) |

---

## 🔒 3. Cross-Origin Cookie & CORS Checklist

If the frontend is on `https://ace-forge.vercel.app` and backend is on `https://ace-forge-api.up.railway.app`:
- [ ] `credentials: "include"` is set on all HTTP requests (handled automatically by `src/lib/api.ts`).
- [ ] Backend `CORS_ORIGIN` includes exact frontend URL (`https://ace-forge.vercel.app`) without trailing slash.
- [ ] Backend `COOKIE_SAME_SITE` is set to `none`.
- [ ] Backend `COOKIE_SECURE` is set to `true`.
- [ ] Alternatively, use Next.js rewrites (default in `next.config.ts`), which routes `/api/*` requests through Next.js, making all cookie communication first-party same-origin!

---

## ⏰ 4. Scheduled Reminders (Cron)

Two options are supported:
1. **In-process Scheduler (Default)**:
   The backend runs an hourly in-process `node-cron` job (`0 * * * *`) that sends Day 6 reminders and marks overdue tasks automatically as long as the backend server remains active.
2. **External Webhook Ping**:
   If hosting on a serverless or auto-sleeping environment, trigger the protected endpoint using GitHub Actions, Cron-job.org, or Mergent:
   ```bash
   curl -X POST https://your-backend-api.up.railway.app/api/cron/reminders \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
   ```

---

## ✅ 5. Post-Deployment Verification Smoke Tests

1. [ ] **Health Endpoint**: `GET https://your-backend-api.../health` returns `{"status":"healthy"}`.
2. [ ] **Admin Login**: Log in as `director@aceprogram.org` with default seed password at `/admin/login`.
3. [ ] **Create Student**: Add a student in Admin Portal; verify welcome email is sent and received.
4. [ ] **Student First Login**: Log in using phone number; verify forced redirect to `/change-password`.
5. [ ] **Submit Report**: Submit a weekly report with GitHub repository link; verify immediate HTTP 200/201 response.
6. [ ] **AI Background Worker**: Verify report status updates from `SUBMITTED` to `AI_REVIEWED` with generated score and comments without blocking the student UI.
7. [ ] **Faculty Grading**: In Admin Portal, review report, inspect AI feedback, and finalize score.
