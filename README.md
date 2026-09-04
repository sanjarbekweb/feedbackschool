# School Psychology Support System

A production-grade, privacy-first psychology support and triage system for schools. Built as a TypeScript monorepo with **NestJS**, **Next.js (App Router)**, **PostgreSQL (Prisma)**, and **Telegram Bot API (grammY)**.

## Architecture & System Invariants

1. **Single Source of Truth**: PostgreSQL database accessed via backend application services. Telegram bots and the web dashboard never talk to each other directly; both are clients of the backend.
2. **Student Privacy Minimization**: Sensitive student message content is never logged, exposed in audit logs, or dispatched to staff Telegram groups. Notifications include only Case ID (`#A81F42`), category, status, and timestamp.
3. **Server-Side Access Control & IDOR Prevention**: Ownership guards and RBAC protect all resources. Students can only access their own cases (unauthorized requests return 404 to avoid case enumeration).
4. **Resilient Dual Telegram Mode**: Supports both polling (development) and webhooks with secret token validation (production).

## Workspace Structure

```
feedbackschool/
├── apps/
│   ├── backend/       # NestJS REST API, SSE stream, Telegram bots, Prisma
│   └── frontend/      # Next.js App Router staff dashboard (Tailwind + Motion)
├── packages/
│   └── types/         # Shared domain contracts, enums, DTOs, and API responses
├── context/           # Architecture, UI specs, security rules, and progress tracking
├── Dockerfile         # Production multi-stage container build
├── railway.json       # Railway deployment manifest
└── package.json       # Monorepo root configuration
```

## Quick Start (Development)

### 1. Prerequisites
- Node.js >= 20.x
- pnpm >= 9.x
- PostgreSQL database

### 2. Setup & Installation
```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Generate Prisma client and apply migrations
cd apps/backend
pnpm prisma:generate
pnpm prisma migrate dev --name init
cd ../..
```

### 3. Running in Development
```bash
# Start backend (http://localhost:3001)
pnpm --filter @psychology/backend start:dev

# Start frontend dashboard (http://localhost:3000)
pnpm --filter @psychology/frontend dev
```

### 4. Running Tests
```bash
pnpm test
```

## Production Deployment

### Backend on Railway (with PostgreSQL)
1. In Railway, click **New Project** -> **Deploy from GitHub repo**.
2. Add a **PostgreSQL** database service in the Railway project. Railway will automatically provide the `DATABASE_URL` variable.
3. In the backend service settings:
   - Build command: `pnpm --filter @psychology/types build && pnpm --filter @psychology/backend prisma:generate && pnpm --filter @psychology/backend build`
   - Start command: `cd apps/backend && pnpm prisma:migrate:prod && node dist/main.js`
   - Healthcheck Path: `/api/health`
4. Configure required environment variables:
   - `NODE_ENV=production`
   - `JWT_SECRET` (generate using `openssl rand -base64 32`)
   - `CORS_ORIGIN` (your Vercel frontend URL, e.g. `https://feedbackschool.vercel.app`)
   - `STUDENT_BOT_TOKEN` & `STAFF_BOT_TOKEN` (from @BotFather)
   - `STAFF_GROUP_ID` (Telegram group ID for triage notifications)
   - `TELEGRAM_MODE=webhook`
   - `TELEGRAM_WEBHOOK_URL=https://<your-backend>.up.railway.app`
   - `TELEGRAM_WEBHOOK_SECRET` (alphanumeric secret token)

### Frontend on Vercel
1. In Vercel, import the repository.
2. Select Root Directory: `apps/frontend`.
3. Set Framework Preset: **Next.js**.
4. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL=https://<your-backend>.up.railway.app`
5. Click **Deploy**.