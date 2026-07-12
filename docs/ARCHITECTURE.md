# Arkitektura e OraProjekt

> **Space:** OP Engineering
> **Parent Page:** Home
> **Last Updated:** 2026-07-12

---

## Përmbledhje

OraProjekt është një sistem multi-tenant për menaxhimin e orëve të punëtorëve nëpër projekte. Arkitektura është hybrid — një Next.js app që shërben si frontend + API + server, me mobile apps (iOS/Android) që e ngarkojnë përmes WebView.

---

## Diagram i Arkitekturës

```
┌─────────────────────────────────────────────────────────────┐
│                        Klientët                              │
├──────────────┬──────────────────┬───────────────────────────┤
│  Web Browser │  iOS App         │  Android App              │
│  (Manager)   │  (Employee)      │  (Employee)               │
│  Next.js SSR │  Capacitor       │  Capacitor                │
│  https://... │  WebView → URL   │  WebView → URL            │
└──────┬───────┴────────┬─────────┴────────────┬──────────────┘
       │                │                      │
       │                │ HTTPS                │
       │                ▼                      ▼
       │    ┌────────────────────────────────────┐
       │    │     Next.js 16 (Vercel/VPS)        │
       │    │  ┌──────────────────────────────┐  │
       └───▶│  │  Frontend (React 19 + SSR)   │  │
            │  │  - shadcn/ui components      │  │
            │  │  - Tailwind CSS 4            │  │
            │  │  - Zustand + TanStack Query  │  │
            │  └──────────────────────────────┘  │
            │  ┌──────────────────────────────┐  │
            │  │  API Routes (REST)           │  │
            │  │  - /api/auth (NextAuth)      │  │
            │  │  - /api/projects             │  │
            │  │  - /api/employees            │  │
            │  │  - /api/timesheets           │  │
            │  │  - /api/reports              │  │
            │  │  - /api/tenant-domains       │  │
            │  └──────────────────────────────┘  │
            └──────────────┬─────────────────────┘
                           │ Prisma ORM
                           ▼
            ┌────────────────────────────────────┐
            │     Database (SQLite / Postgres)   │
            │  ┌──────────────────────────────┐  │
            │  │  Tenant (multi-tenant root)  │  │
            │  │  User + Account + Session    │  │
            │  │  Employee + Project          │  │
            │  │  ProjectAssignment           │  │
            │  │  Timesheet + TenantDomain    │  │
            │  └──────────────────────────────┘  │
            └────────────────────────────────────┘
                           │
                           ▼
            ┌────────────────────────────────────┐
            │  External Services                 │
            │  - Google OAuth                    │
            │  - Microsoft Entra ID              │
            │  - (Future: Sentry, Email, Push)   │
            └────────────────────────────────────┘
```

---

## Komponentët Kryesorë

### 1. Frontend (Next.js 16)
- **Framework:** Next.js 16 me App Router
- **UI Library:** shadcn/ui (40+ komponentë)
- **Styling:** Tailwind CSS 4
- **State Management:**
  - Zustand — client state (user, view, sidebar)
  - TanStack Query — server state (caching, invalidation)
- **Charts:** Recharts (area, pie, bar)
- **Icons:** Lucide React
- **Forms:** React Hook Form + Zod

### 2. Backend (Next.js Route Handlers)
- **API Style:** REST (14 endpoints)
- **Auth:** NextAuth v5 + custom JWT
- **ORM:** Prisma 6
- **Validation:** Manual + Zod (planned)
- **Rate Limiting:** Planned (Upstash Ratelimit)

### 3. Database
- **Development:** SQLite (file-based)
- **Production:** PostgreSQL (planifikuar)
- **Schema:** 10 modele (Tenant, User, Account, Session, VerificationToken, Employee, Project, ProjectAssignment, Timesheet, TenantDomain)

### 4. Mobile (Capacitor)
- **iOS:** Xcode project (Swift Package Manager)
- **Android:** Gradle project
- **Hybrid approach:** Mobile app ngarkon web app në WebView
- **Native features:** Splash screen, app icons, push (planned)

---

## Auth Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    HYRJA (LOGIN)                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Opsioni 1: Credentials (email + password)                 │
│  ─────────────────────────────────────────────              │
│  1. POST /api/auth { email, password }                     │
│  2. Server verifikon password-in                           │
│  3. Kthen JWT token (HMAC-SHA256)                          │
│  4. Client ruan në localStorage                            │
│  5. Çdo kërkesë: Authorization: Bearer <token>             │
│                                                             │
│  Opsioni 2: Google OAuth                                    │
│  ─────────────────────────────────────────────              │
│  1. Click "Hyr me Google"                                  │
│  2. Redirect te Google consent                             │
│  3. Google kthen email + name                              │
│  4. Server kërkon domain në TenantDomain                   │
│  5. Nëse ACTIVE → krijo User + cakto tenant                │
│  6. Nëse jo → refuzo                                       │
│  7. Kthen JWT + NextAuth session                           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Multi-Tenant Strategy

### Niveli Aktual (Faza 1): DB e Përbashkët me `tenantId`

```
┌─────────────────────────────────┐
│       SQLite Database           │
│  ┌───────────────────────────┐  │
│  │  Tenant A ─┬─ Users       │  │
│  │            ├─ Projects    │  │
│  │            ├─ Employees   │  │
│  │            └─ Timesheets  │  │
│  │  ──────────────────────── │  │
│  │  Tenant B ─┬─ Users       │  │
│  │            ├─ Projects    │  │
│  │            └─ Timesheets  │  │
│  └───────────────────────────┘  │
│                                 │
│  Çdo query: WHERE tenantId = ? │
└─────────────────────────────────┘
```

**Avantazhet:** Kosto e ulët, backup i thjeshtë, analytics kros-tenant
**Disavantazhet:** Izolim vetëm në nivel aplikacioni

### Faza 2 (50+ klientë): PostgreSQL + RLS

```sql
-- Row-Level Security policy
CREATE POLICY tenant_isolation ON "Timesheet"
  USING (tenant_id = current_setting('app.current_tenant')::text);

-- Çdo session e seton tenant context:
SET app.current_tenant = 'tenant-123';
```

### Faza 3 (Enterprise): Schema-per-tenant

```
┌──────────────────┐  ┌──────────────────┐
│  tenant_a schema │  │  tenant_b schema │
│  ┌────────────┐  │  │  ┌────────────┐  │
│  │  Users     │  │  │  │  Users     │  │
│  │  Projects  │  │  │  │  Projects  │  │
│  │  ...       │  │  │  │  ...       │  │
│  └────────────┘  │  │  └────────────┘  │
└──────────────────┘  └──────────────────┘
```

---

## Vendime Arkitekturale (ADRs)

### ADR-001: Next.js në vend të NestJS + Vite
**Status:** Accepted
**Konteksti:** Needs full-stack app with API + frontend
**Vendimi:** Next.js 16 (App Router)
**Arsyeja:** Një projekt, një deploy, API Routes brenda, SSR për SEO

### ADR-002: Capacitor në vend të React Native
**Status:** Accepted
**Konteksti:** Need iOS + Android apps
**Vendimi:** Capacitor (WebView hybrid)
**Arsyeja:** Një kod bazë për web + mobile, pa investim në React Native

### ADR-003: Custom JWT + NextAuth
**Status:** Accepted
**Konteksti:** Need auth for web + mobile + OAuth
**Vendimi:** Custom JWT (HMAC-SHA256) + NextAuth për OAuth
**Arsyeja:** Custom JWT punon në WebView/iframe, NextAuth për Google/Microsoft

### ADR-004: SQLite → PostgreSQL
**Status:** Planned
**Konteksti:** SQLite nuk mbështet RLS
**Vendimi:** Migrim PostgreSQL pas 50 klientësh
**Arsyeja:** RLS për izolim më të fortë, skalueshmëri

---

## Security

### Auth Security
- HMAC-SHA256 me timing-safe comparison
- Token expiry (7 ditë)
- DB validation në çdo kërkesë (user duhet të ekzistojë)
- Session secret në environment variable

### Multi-Tenant Security
- `tenantId` në çdo query (application-level)
- Tenant validation në Authorization header
- Cross-tenant operations të bllokuara
- Planifikuar: PostgreSQL RLS (DB-level)

### Input Validation
- Email format validation
- Length caps (name 200, description 5000)
- Number range validation (hours 0.25-24)
- Date validation (no future dates for timesheets)
- Status whitelisting (DRAFT/SUBMITTED/APPROVED/REJECTED)

### Transport Security
- HTTPS only (production)
- HSTS headers (Caddy)
- No mixed content (Android)
- ATS enabled (iOS)

---

## Performance

### Frontend
- Next.js SSR për first paint më të shpejtë
- TanStack Query për caching të API responses
- Code splitting automatik
- Image optimization (Next.js Image)
- Font optimization (next/font)

### Backend
- Prisma query optimization (select only needed fields)
- Database indexes në tenantId + date
- API rate limiting (planned)
- Connection pooling (Prisma)

### Mobile
- WebView caching
- Splash screen për perceptim më të shpejtë
- Përmbajtje statike e ngarkuar lokalisht
- API responses të cached nga TanStack Query
