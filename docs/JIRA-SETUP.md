# Jira Kanban Board Setup Guide

## Hapi 1: Krijo Jira Project

1. Shko te https://www.atlassian.com/software/jira/free
2. Sign up me email (falas për deri 10 përdorues)
3. Create project → "Kanban"
4. Project name: **OraProjekt**
5. Project key: **OP**
6. Project type: **Team-managed** (më i thjeshtë)

## Hapi 2: Konfiguro Kolonat

Në project settings → Board → Columns, vendos këto 5 kolona:

```
Backlog → To Do → In Progress → In Review → Done
```

| Kolona | WIP Limit | Qëllimi |
|--------|-----------|---------|
| Backlog | ∞ | Ide + tasks të ardhshme |
| To Do | 10 | Kjo javë / ky sprint |
| In Progress | 3 | Tani duke u punuar |
| In Review | 2 | PR hapur, duke u rishikuar |
| Done | ∞ | Përfunduar + merged |

## Hapi 3: Shto Issue Types

Në Project settings → Issue Types:

| Type | Përdorimi |
|------|-----------|
| **Epic** | Features të mëdha (p.sh. "Mobile App v1") |
| **Story** | User stories ("Si punëtor, deshiroj të...") |
| **Task** | Punë teknike ("Konfiguro OAuth") |
| **Bug** | Defekte |
| **Sub-task** | Ndarje e story/task |

## Hapi 4: Shto Labels

Labels për filtrim:

| Label | Për |
|-------|-----|
| `web` | Frontend/Backend web |
| `mobile` | iOS/Android |
| `api` | API endpoints |
| `infra` | Deployment, CI/CD, server |
| `auth` | Authentication |
| `database` | DB changes |
| `security` | Security fixes |
| `design` | UI/UX |
| `docs` | Documentation |
| `legal` | Privacy, terms |
| `notifications` | Push/email |
| `i18n` | Translations |

## Hapi 5: Importo Issues nga CSV

1. Shko te **Issues** → **Import** → **Import CSV file**
2. Upload `docs/jira-issues.csv`
3. Map columns:
   - `Summary` → Summary
   - `Issue Type` → Issue Type
   - `Status` → Status
   - `Priority` → Priority
   - `Labels` → Labels
   - `Description` → Description
4. Click **Import**

Kjo do të krijojë **30 issues** të gati.

## Hapi 6: Krijo Epics

Shto këto Epics manualisht:

### Epic 1: "MVP Web App" (DONE)
- Stories: Login, Dashboard, Projects, Employees, Timesheets, Reports
- Labels: `web`, `mvp`

### Epic 2: "Mobile Apps" (IN PROGRESS)
- Stories: iOS build, Android build, App Store submit, Play Store submit
- Labels: `mobile`, `ios`, `android`

### Epic 3: "Production Launch"
- Stories: Deploy, Domain, OAuth, Privacy Policy, Backups
- Labels: `infra`, `launch`

### Epic 4: "Security Hardening"
- Stories: RLS, Rate limiting, Audit log, Pen testing
- Labels: `security`

### Epic 5: "Growth Features"
- Stories: Push notifications, Email, PDF export, i18n, Templates
- Labels: `features`

## Hapi 7: Konfiguro Sprint Workflow

1. Settings → Board → General → **Enable Sprints**
2. Sprint duration: **2 weeks**
3. Start day: **Monday**
4. Enable **Estimation** (Story points)

## Hapi 8: Shto Components

Për organizim më të mirë:

| Component | Përshkrimi |
|-----------|------------|
| Frontend | React/Next.js components |
| Backend | API routes |
| Database | Prisma schema |
| Auth | NextAuth + OAuth |
| Mobile | Capacitor iOS/Android |
| Infra | Docker, CI/CD, deployment |

## Hapi 9: Integrime

### GitHub Integration
1. Project settings → Apps → GitHub
2. Connect GitHub account
3. Select repo `erlisgashi67-commits/OraProjekt`
4. Enable: Smart commits, Branch creation, PR linking

### Slack Integration (opsionale)
1. Project settings → Apps → Slack
2. Connect workspace
3. Notifications: Issue created, status changed, sprint started

## Hapi 10: Filters & Dashboards

Krijo këto filtra të ruajtur:

```
# My open issues
assignee = currentUser() AND status != Done

# This sprint
sprint in openSprints()

# High priority bugs
issuetype = Bug AND priority = High AND status != Done

# Mobile epic
"Epic Link" = "Mobile Apps" AND status != Done

# Ready for review
status = "In Review"
```

## Boardi Final

```
┌─────────┬─────────┬─────────────┬────────────┬──────┐
│ Backlog │  To Do  │ In Progress │ In Review  │ Done │
│  (15)   │  (8)    │    (2)      │    (1)     │ (4)  │
├─────────┼─────────┼─────────────┼────────────┼──────┤
│ Ideas   │ GitLab  │ Deploy Vercel│ OAuth test │ Login│
│ RLS     │ Domain  │ iOS build   │            │ Dash │
│ i18n    │ Apple $ │             │            │ Proj │
│ Audit   │ Play $  │             │            │ Empl │
│ PDF     │ Privacy │             │            │ Time │
│ ...     │ ...     │             │            │      │
└─────────┴─────────┴─────────────┴────────────┴──────┘
```

## Quick Commands

| Veprim | Shortcut |
|--------|----------|
| Krijo issue | `c` |
| Edit issue | `e` |
| Cakto mua | `a` |
| Lëviz në Done | `d` |
| Kërko | `/` |
| Board view | `b` |

---

**Koha totale:** 15-20 minuta për setup + 5 minuta për CSV import = **~25 minuta**
