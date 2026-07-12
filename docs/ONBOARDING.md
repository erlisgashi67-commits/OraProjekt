# Onboarding për Anëtarë të Ri

> **Space:** OP Engineering
> **Parent Page:** Home

---

## Mirë se erdhe në OraProjekt! 👋

Ky dokument do të të ndihmojë të filloni sa më shpejt. Ndjek këto hapa në renditje.

---

## Hapi 1: Environment Setup (30 minuta)

### 1.1 Instalo tools

```bash
# Node.js 18+ (preferably me Bun)
curl -fsSL https://bun.sh/install | bash

# Git (nëse s'ke)
sudo apt install git  # Linux
brew install git      # Mac

# VS Code (rekomanduar)
# https://code.visualstudio.com/

# Opsionale: Docker për production testing
# https://docs.docker.com/get-docker/
```

### 1.2 Clone repos

```bash
# GitHub (kryesor)
git clone https://github.com/erlisgashi67-commits/OraProjekt.git
cd OraProjekt

# Shto GitLab remote (pas të kërkuar akses)
git remote add gitlab https://gitlab.com/USERNAME/oraprojekt.git
```

### 1.3 Instalo dependencies

```bash
bun install
```

### 1.4 Setup environment

```bash
cp .env.example .env
# Edit .env me vlerat e tua:
# - DATABASE_URL (default: SQLite)
# - AUTH_SECRET (generate: openssl rand -base64 32)
# - GOOGLE_CLIENT_ID (nëse ke OAuth)
# - GOOGLE_CLIENT_SECRET
```

### 1.5 Setup database

```bash
# Krijo tabelet
bun run db:push

# Gjenero Prisma client
bun run db:generate

# Seed demo data
bun run scripts/seed.ts
```

### 1.6 Start dev server

```bash
bun run dev
# Hap http://localhost:3000
```

### 1.7 Verifiko që punon

Hyr me demo account:
- Email: `menaxher@oraprojekt.demo`
- Password: `123456`

Duhet të shohësh dashboard me grafikë dhe KPIs.

---

## Hapi 2: Njihu me Kodin (1 orë)

### Struktura e projektit

```
src/
├── app/
│   ├── api/          ← REST API (14 endpoints)
│   ├── layout.tsx    ← Root layout
│   └── page.tsx      ← Main page (routing)
├── components/
│   ├── ui/           ← shadcn/ui (40+ komponentë)
│   ├── views/        ← 8 views (dashboard, projects, etj.)
│   ├── app-shell.tsx ← Sidebar + topbar
│   └── ...
├── lib/
│   ├── api.ts        ← API client + formatters
│   ├── auth.ts       ← Session management
│   ├── db.ts         ← Prisma client
│   └── types.ts      ← TypeScript types
└── store/
    └── app.ts        ← Zustand store
```

### Ku ndodhet çfarë?

| Dua të... | Shiko në... |
|-----------|-------------|
| Ndryshoj një API endpoint | `src/app/api/[route]/route.ts` |
| Shtoj një view të ri | `src/components/views/` |
| Ndryshoj një komponent UI | `src/components/ui/` |
| Ndryshoj databazën | `prisma/schema.prisma` |
| Shtoj një tip të ri | `src/lib/types.ts` |
| Ndryshoj routing | `src/app/page.tsx` |
| Ndryshoj auth | `src/lib/auth.ts` + `src/lib/auth.config.ts` |

### Lexo dokumentacionin

1. **README.md** — Overview i projektit
2. **docs/API.md** — API reference (14 endpoints)
3. **docs/ARCHITECTURE.md** — Diagramë + vendime
4. **docs/DEPLOYMENT.md** — Si deploy në prod

---

## Hapi 3: Workflow (15 minuta)

### Git workflow

```bash
# 1. Krijo branch për feature të ri
git checkout -b feature/mbiemri-emri-feature

# 2. Bëj ndryshimet...
git add .
git commit -m "feat: përshkrimi i ndryshimit"

# 3. Push te GitHub + GitLab
git push origin feature/mbiemri-emri-feature
git push gitlab feature/mbiemri-emri-feature

# 4. Hap Pull Request në GitHub
# 5. Pasi aprovohet, merge te main
```

### Commit message conventions

```
feat:     ← Feature i ri
fix:      ← Bug fix
docs:     ← Dokumentacion
style:    ← Formatim (pa ndryshim kodi)
refactor: ← Refaktorim
test:     ← Testim
chore:    ← Maintenance
```

Shembull: `feat: shto eksport PDF për raporte`

### Lint para commit

```bash
bun run lint
# Duhet të kalojë pa errors para commit
```

---

## Hapi 4: Demo Accounts

| Email | Password | Rol | Që mund të bësh |
|-------|----------|-----|-----------------|
| `menaxher@oraprojekt.demo` | 123456 | Manager | Të gjitha |
| `ana@oraprojekt.demo` | 123456 | Employee | Orët e mia, projektet e mia |
| `bekim@oraprojekt.demo` | 123456 | Employee | Orët e mia, projektet e mia |
| `drita@oraprojekt.demo` | 123456 | Employee | Orët e mia, projektet e mia |
| `eron@oraprojekt.demo` | 123456 | Employee | Orët e mia, projektet e mia |

---

## Hapi 5: Task të Para

Sapo të kesh setup, merr një nga këto task-e të lehta për të filluar:

### Junior / Fillestar
- [ ] Shto validim për phone format (+383...)
- [ ] Shto konfirmim para fshirjes së timesheet
- [ ] Përmirso empty states (mesazhe më të mira)
- [ ] Shto keyboard shortcuts (j/k për navigation)

### Mid-level
- [ ] Implemento bulk import CSV për timesheets
- [ ] Shto PDF export për raporte
- [ ] Implemento audit log
- [ ] Shto multi-language support (EN/SQ)

### Senior
- [ ] Migrim PostgreSQL + RLS
- [ ] Implemento push notifications
- [ ] Shto rate limiting
- [ ] Setup Sentry për error monitoring

---

## Hapi 6: Ku të kërkoj ndihmë?

| Çfarë | Ku |
|-------|-----|
| Pyetje teknike | Slack channel `#oraprojekt-dev` |
| Bug report | Jira — krijo Bug issue |
| Dokumentacion | Confluence space `OP Engineering` |
| Code review | GitHub PR |
| Emergjenca prod | telefononi +383 ... |

---

## Checklist për ditën e parë

- [ ] Clone repos (GitHub + GitLab)
- [ ] `bun install` suksesshëm
- [ ] `.env` konfiguruar
- [ ] `bun run db:push` suksesshëm
- [ ] `bun run dev` starton pa errors
- [ ] Hyrje me demo account suksesshme
- [ ] Lexo README.md
- [ ] Lexo docs/ARCHITECTURE.md
- [ ] Njihu me Jira board
- [ ] Njihu me Confluence space
- [ ] Parë një Pull Request ekzistues
- [ ] Marrë një task të parë

---

**Mirë se erdhe në ekip! 🚀**
