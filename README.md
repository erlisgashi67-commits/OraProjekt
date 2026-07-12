# OraProjekt

> Sistem multi-tenant për menaxhimin e orëve të punëtorëve nëpër projekte.

[![Pipeline Status](https://img.shields.io/badge/pipeline-passing-brightgreen)]()
[![Coverage](https://img.shields.io/badge/coverage-0%25-yellow)]()
[![License](https://img.shields.io/badge/license-MIT-blue)]()

## Përmbledhje

OraProjekt është një platformë web për ekipet që punojnë në disa projekte njëkohësisht. Punëtorët regjistrojnë orët e punës nga telefoni ose desktopi, ndërsa menaxherët i aprovojnë/refuzojnë dhe shohin raporte mujore.

## Tech Stack

| Layer | Teknologjia |
|-------|-------------|
| **Frontend** | Next.js 16, React 19, TypeScript 5, Tailwind CSS 4, shadcn/ui |
| **Backend** | Next.js Route Handlers (API) |
| **Database** | Prisma ORM + SQLite (dev) / PostgreSQL (prod) |
| **Auth** | NextAuth v5 + custom JWT + Google/Microsoft OAuth |
| **State** | Zustand (client), TanStack Query (server) |
| **Charts** | Recharts |
| **Icons** | Lucide React |
| **Package Manager** | Bun |

## Quick Start

```bash
# 1. Clone
git clone git@gitlab.com:oraprojekt/oraprojekt-web.git
cd oraprojekt-web

# 2. Install dependencies
bun install

# 3. Setup environment
cp .env.example .env
# Edit .env with your values (DATABASE_URL, AUTH_SECRET, OAuth credentials)

# 4. Setup database
bun run db:push
bun run db:generate

# 5. Seed demo data (optional)
bun run scripts/seed.ts

# 6. Start dev server
bun run dev
# Open http://localhost:3000
```

## Demo Accounts

| Email | Password | Rol |
|-------|----------|-----|
| menaxher@oraprojekt.demo | 123456 | Manager |
| ana@oraprojekt.demo | 123456 | Employee |
| bekim@oraprojekt.demo | 123456 | Employee |
| drita@oraprojekt.demo | 123456 | Employee |
| eron@oraprojekt.demo | 123456 | Employee |

## Projekt Struktura

```
oraprojekt-web/
├── prisma/
│   └── schema.prisma          # Database schema
├── public/                    # Static assets (logo, icons)
├── src/
│   ├── app/
│   │   ├── api/               # API routes (REST endpoints)
│   │   │   ├── auth/          # Login, logout, session
│   │   │   ├── projects/      # Projects CRUD
│   │   │   ├── employees/     # Employees CRUD
│   │   │   ├── timesheets/    # Timesheets CRUD + status
│   │   │   ├── reports/       # Reports aggregation
│   │   │   └── tenant-domains/# Domain mapping for OAuth
│   │   ├── globals.css        # Global styles + theme
│   │   ├── layout.tsx         # Root layout
│   │   └── page.tsx           # Main page (app shell)
│   ├── components/
│   │   ├── ui/                # shadcn/ui components
│   │   ├── views/             # Page views (dashboard, projects, etc.)
│   │   ├── app-shell.tsx      # Sidebar + topbar + content
│   │   ├── login-screen.tsx   # Login page
│   │   ├── log-time-dialog.tsx# Log hours dialog
│   │   └── theme-provider.tsx # Dark/light theme
│   ├── lib/
│   │   ├── api.ts             # API client + formatters
│   │   ├── auth.ts            # Session management (custom JWT)
│   │   ├── auth.config.ts     # NextAuth config (Google/Microsoft)
│   │   ├── db.ts              # Prisma client
│   │   ├── types.ts           # TypeScript types
│   │   └── utils.ts           # Utilities
│   └── store/
│       └── app.ts             # Zustand store
├── docs/                      # Documentation
│   ├── API.md                 # API reference (Confluence)
│   └── openapi.json           # OpenAPI/Swagger spec
├── scripts/                   # Utility scripts
│   ├── seed.ts                # Database seeding
│   └── cleanup-orphans.ts     # Cleanup orphaned records
├── .gitlab-ci.yml             # CI/CD pipeline
├── Dockerfile                 # Docker build
├── docker-compose.yml         # Production deployment
├── Caddyfile                  # Reverse proxy config
└── package.json
```

## Scripts

| Command | Description |
|---------|-------------|
| `bun run dev` | Start dev server (http://localhost:3000) |
| `bun run build` | Production build |
| `bun run start` | Start production server |
| `bun run lint` | Run ESLint |
| `bun run db:push` | Push schema to database |
| `bun run db:generate` | Generate Prisma client |
| `bun run db:migrate` | Create migration |
| `bun run db:reset` | Reset database (destructive) |

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | ✅ |
| `AUTH_SECRET` | NextAuth secret (32+ chars) | ✅ |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | For Google login |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | For Google login |
| `MICROSOFT_CLIENT_ID` | Microsoft Entra ID client ID | For Microsoft login |
| `MICROSOFT_CLIENT_SECRET` | Microsoft Entra ID client secret | For Microsoft login |

## Multi-tenant Architecture

Çdo organizatë është një "tenant" i izoluar. Të gjitha të dhënat janë të scoped me `tenantId`:

- **Users** belong to a tenant
- **Projects** belong to a tenant
- **Employees** belong to a tenant
- **Timesheets** belong to a tenant

Tenant resolution për OAuth:
1. User signs in me Google/Microsoft
2. Sistemi merr domain nga email (p.sh. `ana@kompania-ks.com` → `kompania-ks.com`)
3. Kërkon në `TenantDomain` tabelë
4. Nëse gjen match → cakton user te ai tenant
5. Nëse jo → refuzon hyrjen me mesazh "kërko ftesë"

## Auth Flow

```
┌─────────────────────────────────────────────────┐
│ 1. User submits email + password                │
│    POST /api/auth → returns JWT token           │
├─────────────────────────────────────────────────┤
│ 2. Client stores token in localStorage          │
│    (op_token key)                               │
├─────────────────────────────────────────────────┤
│ 3. Every API request sends:                     │
│    Authorization: Bearer <token>                │
├─────────────────────────────────────────────────┤
│ 4. Server verifies token (HMAC-SHA256)          │
│    - Checks expiry (7 days)                     │
│    - Validates user exists in DB                │
│    - Returns session with tenantId, role        │
└─────────────────────────────────────────────────┘
```

## Security

- **HMAC-SHA256** token signing with timing-safe comparison
- **Tenant isolation** — every query scoped by `tenantId`
- **Role-based access** — MANAGER vs EMPLOYEE
- **Input validation** — all API routes validate input
- **SQL injection protection** — Prisma ORM parameterized queries
- **XSS protection** — React escapes by default
- **CSRF protection** — SameSite cookies + token in header

## CI/CD

Pipeline-i GitLab (.gitlab-ci.yml) ka 4 stages:

1. **lint** — ESLint check (every commit)
2. **test** — Placeholder for unit tests
3. **build** — Next.js production build (main/develop/tags)
4. **deploy** — SSH deploy to staging/production (manual trigger)

## Documentation

- **[API Reference](docs/API.md)** — për Confluence
- **[OpenAPI Spec](docs/openapi.json)** — për Swagger/Postman
- **[Architecture](docs/ARCHITECTURE.md)** — diagramë + vendime

## License

MIT © OraProjekt 2026
