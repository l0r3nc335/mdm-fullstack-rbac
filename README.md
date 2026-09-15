# Multi-Tenant RBAC Demo

Full-stack demo of organization-scoped role-based access control with React, Express, PostgreSQL, and an Expo bonus screen.

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vite, React 19, TypeScript, Redux Toolkit, TanStack Query, Axios, Tailwind (Tailadmin-style layout) |
| Backend | Node.js 24, Express, Prisma, JWT, bcrypt |
| Database | PostgreSQL 16 (Docker) |
| Mobile | Expo (React Native) |

## Project structure

```
RBAC/
  docker-compose.yml
  backend/          Express API + Prisma schema/seed
  frontend/         Admin web app
  mobile/           Bonus content list screen
```

## Quick start

### 1. Start PostgreSQL

```bash
docker compose up -d
```

Postgres is published on **port 5433** (to avoid clashing with a local Postgres on 5432).

### 2. Backend

```bash
cd backend
cp .env.example .env   # already configured for local Docker
npm install
npx prisma migrate dev
npx prisma db seed
npm run dev
```

API: `http://localhost:4000`

### 3. Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

App: `http://localhost:5173`

### 4. Mobile (bonus)

```bash
cd mobile
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_URL` to your machine IP when using a physical device (e.g. `http://192.168.x.x:4000/api`). Emulators may need `http://10.0.2.2:4000/api` (Android).

## Demo accounts

Password for all seeded users: **`Password123!`**

| Role | Email |
|------|-------|
| Super Admin | `superadmin@demo.local` |
| Admin (Acme Corp) | `admin@acmecorp.demo.local` |
| Subscriber (Acme Corp) | `subscriber@acmecorp.demo.local` |
| Manager (Acme Corp) | `manager1@acmecorp.demo.local` |
| Employee (Acme Corp) | `employee1.1@acmecorp.demo.local` |

The login page includes a dropdown above the email field to select these accounts.

### Seed shape

- 3 organizations: Acme Corp, Globex Industries, Initech Solutions
- 1 subscriber per organization
- 2 managers per organization
- 20 employees per manager (teams)
- Content items = personal profile data for each employee/manager
- Org roles include `content_viewer` (read-only) and `content_editor` (full content CRUD) for the assignment requirement

## Roles & permissions

| Role | Scope | Capabilities |
|------|--------|--------------|
| `super_admin` | Cross-tenant | All permissions; create/manage organizations |
| `admin` | Organization | Teams, users, roles, content (read/write), subscription |
| `subscriber` | Organization | Manage subscription; read content |
| `manager` | Team | Read own + direct reports' content |
| `employee` | Self | Read/write own content only |
| `content_viewer` | Organization | `content:read` only |
| `content_editor` | Organization | `content:read` + `content:write` |

Permission codes: `org:manage`, `team:manage`, `user:manage`, `role:manage`, `content:read`, `content:write`, `subscription:manage`.

Enforcement is layered:

1. JWT authentication
2. Permission middleware on routes
3. Data scoping (org / team / self) in content services
4. Frontend menu/actions gated by permissions (API remains authoritative)

## Multi-tenancy

- Database uses **integer** primary/foreign keys
- API tenant routes use **organization UUID**: `/api/organizations/:orgUuid/...`
- Super admin can switch active organization in the UI header

## API overview

| Method | Path | Notes |
|--------|------|-------|
| POST | `/api/auth/login` | Email/password → JWT + user/roles/permissions |
| GET | `/api/auth/me` | Current user |
| GET | `/api/auth/demo-accounts` | Seeded login presets |
| GET/POST | `/api/organizations` | List / create (super admin) |
| GET/PATCH | `/api/organizations/:orgUuid` | Org detail |
| CRUD | `/api/organizations/:orgUuid/teams` | Teams |
| CRUD | `/api/organizations/:orgUuid/users` | Users |
| GET/POST/PATCH | `/api/organizations/:orgUuid/roles` | Roles + permission assignment |
| CRUD | `/api/organizations/:orgUuid/content` | Content items (`?userId=` filter) |
| GET/PATCH | `/api/organizations/:orgUuid/subscription` | Subscription |

Responses use `{ data }` or `{ error: { message, code } }`.

## Design decisions

- **Prisma** for schema, migrations, and typed queries
- **JWT** access tokens (8h) — suitable for a demo, not production session management
- **Content items** store personal profile JSON so managers can view team profiles without a separate HR module
- **Tailadmin-inspired** admin shell (sidebar + tables) implemented with Tailwind OSS patterns — not the commercial Tailadmin Pro package

## Limitations

- No refresh tokens / token revocation list
- No email verification or password reset
- Demo password is shared and committed to seed docs only (not hashed plaintext in the DB)
- Soft multi-tenant isolation for super admin via UI org switcher
- Mobile app is a single screen (login + content list), not a full admin client
- Production targets (Supabase / EC2 / Vercel) are documented in project rules but not wired in this local demo

## Testing & CI

This is an npm workspaces monorepo (`backend` + `frontend`). From the repo root:

```bash
npm install
npm run test              # Vitest (BE + FE)
npm run test:e2e          # Cypress smoke (starts FE on :5175)
npm run test:all          # lint + unit + build + e2e (also used by Husky pre-push)
```

| Guard | What runs |
|-------|-----------|
| Husky `pre-push` | `npm run test:all` — blocks push to any branch if tests fail |
| GitHub `Test` workflow | Vitest + lint + build on every push/PR; Cypress smoke after unit job |
| `Deploy Backend` | EC2 rsync → `$EC2_DEPLOY_PATH/backend` + migrate on `main`/`master` |
| `Deploy Frontend` | EC2 rsync → `$EC2_DEPLOY_PATH/frontend` (built Vite app) on `main`/`master` |

Required GitHub secrets for deploy:

Shared EC2:
- `EC2_SSH_KEY`, `EC2_HOST`, `EC2_USER`, `EC2_PORT`
- `EC2_DEPLOY_PATH` — app root on the server, e.g. `/var/www/html2`  
  (creates `/var/www/html2/backend` and `/var/www/html2/frontend`)  
  Fallback: `BE_EC2_DEPLOY_PATH` if `EC2_DEPLOY_PATH` is unset

Backend:
- `BE_EC2_RELOAD_CMD` — e.g. `pm2 restart rbac-api`

Frontend:
- `VITE_API_URL` — API URL baked into the Vite build (e.g. `http://YOUR_EC2_IP:4000/api`)
- `EC2_RELOAD_CMD` or `FE_EC2_RELOAD_CMD` — e.g. `sudo systemctl reload nginx`

Remove unused Vercel secrets if present: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

On the server after first deploy you should see:

```text
/var/www/html2/
  backend/    # Express + Prisma (from repo backend/)
  frontend/   # Vite app including dist/ (from repo frontend/)
```

Point nginx `root` at `/var/www/html2/frontend/dist` (SPA). Keep the API process running from `/var/www/html2/backend`. If you previously dumped backend files directly into `/var/www/html2`, move/clean that root so only the `backend` and `frontend` folders remain.

## Smoke checks

1. Log in as Super Admin → create/rename organizations, switch org context
2. Log in as Admin → manage teams/users/roles/content
3. Log in as Manager → content list shows self + team members only
4. Log in as Employee → can edit own profile content only
5. Log in as Subscriber → subscription page works; cannot manage users
6. Mobile: log in as employee → see that user's content list
