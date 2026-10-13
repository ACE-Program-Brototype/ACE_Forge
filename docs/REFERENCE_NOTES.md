# ACE_WEB Reference Architecture & Integration Notes

## 1. Executive Summary
This document summarizes the analysis of the reference project (`ace-web`) and outlines how its architectural patterns, visual tokens, and conventions are adapted to construct **ace_forge** — a production-grade student weekly task management, report submission, and AI-assisted evaluation platform.

---

## 2. Findings from `ace_web` Inspection

### 2.1 Technology Stack
- **Framework**: React 19 (`^19.2.8`) bundled with Vite 8 (`^8.2.0`).
- **Routing**: React Router v7 (`^7.18.2`) using client-side `BrowserRouter`.
- **Styling**: Tailwind CSS v3 (`^3.4.19`), PostCSS, and custom CSS variables in `src/index.css`.
- **Animations**: Framer Motion (`^13.1.0`) for staggered fades, scale-ins, and scroll progress.
- **Icons**: React Icons (`^5.7.0`), primarily Remix Icons (`react-icons/ri`) and Material Symbols.
- **Forms**: React Hook Form (`^7.85.0`) with basic local state.
- **Feedback & Notifications**: `react-hot-toast` (`^2.6.0`).
- **Linting**: Oxlint (`^1.75.0`).
- **Backend / Auth / Database**: **None**. `ace-web` is purely a static marketing showcase and public directory driven by static JS mock datasets (`src/constants/*`). There are no server APIs, no authentication guards, and no persistent database models.

### 2.2 Visual Style & Design System
The visual language is an **Editorial Minimalist** aesthetic pairing deep navy authority with vibrant amber energy:
- **Brand Palette**:
  - `primary`: `#002C5F` (ACE Deep Navy)
  - `primary-dark`: `#001F43`
  - `primary-soft`: `#EEF3F9`
  - `accent`: `#FCAC04` (ACE Amber / Gold)
  - `accent-hover`: `#E59B00`
  - `accent-container`: `#FFF5E0`
  - `surface` / `background`: `#f9f9fb`
  - `surface-container-lowest`: `#ffffff`
  - `outline`: `#64748B` / `outline-variant`: `#D4D8E2`
  - `error`: `#ba1a1a`
- **Typography**:
  - Display / Headlines: Serif (`"Playfair Display"`, `Georgia`, `serif`) with letter spacing `-0.02em` to `-0.01em`.
  - Body & Labels: Sans-serif (`"Geist"`, `"Inter"`, `system-ui`, `sans-serif`).
  - Code / Monospace: Monospace (`"Geist"`, `ui-monospace`, `monospace`).
- **Layout Architecture**:
  - Top navigation bar (sticky, height `64px` / `72px`, logo left, navigation items centered, CTA right).
  - Admin layout pattern: Sticky left sidebar (`260px`) with navigation pills, main content grid with responsive stat cards (4-column grid), activity list, and domain gauges.

---

## 3. Technology Choices for `ace_forge`

Because `ace-web` lacks backend, database, authentication, background workers, and email infrastructure, we adopt the recommended production stack:

| Domain | `ace-web` Reference | `ace_forge` Production Implementation | Rationale |
|---|---|---|---|
| **Core Framework** | React 19 + Vite 8 SPA | **Next.js 15 (App Router, TypeScript)** | Provides SSR, server components, secure server actions, API route handlers, and unified server-client architecture. |
| **Language** | JavaScript (ESM) | **TypeScript 5** | Strict typing for domain models, role safety, and compile-time contract enforcement. |
| **Database & ORM** | None (in-memory mock constants) | **Prisma ORM + PostgreSQL** | Relational integrity, migrations, foreign keys, unique constraints, and ACID transactions. |
| **Design System** | Tailwind CSS v3 tokens | **Tailwind CSS v3 matching `ace-web`** | Reuses exact color hexes (`#002C5F`, `#FCAC04`, `#f9f9fb`), typography, rounded borders, and card styles. |
| **Authentication** | None | **Custom HTTP-Only JWT Session Cookies** | Separate session scopes for Admin and Student, bcrypt password hashing, `mustChangePassword` flow, and rate limiting. |
| **Validation** | None | **Zod** | Runtime schema validation on every client form, server action, and API route. |
| **Email Service** | None | **Nodemailer** | SMTP integration with support for console logging dev mode (`EMAIL_DEV_MODE=true`). |
| **Scheduled Tasks** | None | **node-cron + scheduler daemon / route** | Idempotent automated processing for day-6 student reminders and task overdue transitions. |
| **AI Evaluation** | None | **Anthropic Claude API** | Structured JSON schema output evaluating report clarity, task alignment, and code originality. |
| **Code Inspection** | None | **GitHub REST API Client** | Fetches commit history, author distributions, file trees, and key source files. |

---

## 4. Architectural Boundaries

- **Separation of Concerns**:
  - `src/app/` — UI routes and API endpoints.
  - `src/lib/` — Singletons (Prisma client, email transport, Anthropic client, Octokit/fetch client, JWT utilities).
  - `src/services/` — Business logic (student service, task assignment, report submission, reminder service, AI review service).
  - `src/validators/` — Zod schemas.
  - `src/components/` — UI presentation matching `ace-web` design tokens.
- **Security Posture**:
  - Server-side role authorization on every protected route and mutation.
  - Strict input sanitization and verification.
  - Zero leakage of AI feedback or employee marks to students.
