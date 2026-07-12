# OraProjekt — API Documentation

> **Version:** 1.0
> **Last Updated:** 2026-07-12
> **Base URL:** `https://oraprojekt.com/api`
> **Authentication:** Bearer token (JWT) or session cookie

---

## Përmbledhje

OraProjekt API është një REST API i bazuar në Next.js Route Handlers. Të gjitha endpoints janë **multi-tenant** — çdo kërkesë është e scoped automatikisht me `tenantId` nga sesioni i përdoruesit.

### Konventa

| Metoda | Përdorimi |
|--------|-----------|
| `GET` | Lexim (listë ose detaje) |
| `POST` | Krijim |
| `PUT` | Përditësim i plotë |
| `PATCH` | Përditësim parcial |
| `DELETE` | Fshirje |

### Formatet

- **Content-Type:** `application/json` (për body)
- **Dates:** `YYYY-MM-DD` (për input), ISO 8601 (për output)
- **IDs:** CUID (25 karaktere)

---

## Autentikimi

### Mënyrat e hyrjes

| Metodë | Header/Cookie | Përdorimi |
|--------|---------------|-----------|
| **Bearer Token** (primar) | `Authorization: Bearer <token>` | API clients, mobile apps |
| **Cookie** (fallback) | `op_session=<token>` | Web app same-origin |
| **NextAuth** (OAuth) | `next-auth.session-token` cookie | Google/Microsoft sign-in |

### Token Lifetime

- Token-i skadon pas **7 ditësh** nga lëshimi
- Token-i përmban `iat` (issued-at) për verifikim skadimi
- Token-i është i nënshkruar me HMAC-SHA256

### Rolet

| Rol | Lejet |
|-----|-------|
| `MANAGER` | Të gjitha operacionet brenda tenant-it |
| `EMPLOYEE` | Vetëm orët e veta (lexim + editim DRAFT/SUBMITTED) |

---

## Endpoints

### 1. Authentication

#### `POST /api/auth` — Hyrje (Login)

**Body:**
```json
{
  "email": "menaxher@oraprojekt.demo",
  "password": "123456"
}
```

**Response 200:**
```json
{
  "id": "cmrh54w0e0002og1rigcgnb1q",
  "email": "menaxher@oraprojekt.demo",
  "name": "Lirak Berisha",
  "role": "MANAGER",
  "tenantId": "cmrh54w0d0000og1rgx66bg41",
  "tenantName": "OraProjekt Demo",
  "employeeId": "cmrh54w0f0004og1r1k1c0bav",
  "token": "eyJpZCI6ImNtcmg1..."
}
```

**Response 401:**
```json
{ "error": "Kredenciale të gabuara" }
```

---

#### `GET /api/auth` — Sesioni aktual

Kthen përdoruesin e kyqur aktualisht.

**Response 200:**
```json
{
  "user": {
    "id": "...",
    "email": "...",
    "name": "...",
    "role": "MANAGER",
    "tenantId": "...",
    "tenantName": "...",
    "employeeId": "..."
  }
}
```

Ose `{"user": null}` nëse i paidentifikuar.

---

#### `DELETE /api/auth` — Dalje (Logout)

Shkatërron sesionin (fshin cookie + token).

**Response 200:**
```json
{ "ok": true }
```

---

### 2. Projects

#### `GET /api/projects` — Listë projekte

Kthen të gjitha projektet e tenant-it aktual me statistika.

**Response 200:**
```json
{
  "projects": [
    {
      "id": "...",
      "name": "Rindërtimi i Faqes",
      "description": "...",
      "status": "ACTIVE",
      "budgetHours": 320,
      "startDate": "2026-06-01T00:00:00.000Z",
      "endDate": "2026-09-30T00:00:00.000Z",
      "color": "#10b981",
      "createdAt": "2026-07-12T...",
      "assignmentsCount": 3,
      "timesheetsCount": 45,
      "loggedHours": 161.6,
      "team": [
        { "id": "...", "name": "Ana Krasniqi", "position": "Frontend Developer", "role": "Frontend Lead" }
      ]
    }
  ]
}
```

**Auth:** MANAGER ose EMPLOYEE

---

#### `POST /api/projects` — Krijim projekti

**Auth:** MANAGER vetëm

**Body:**
```json
{
  "name": "Projekt i Ri",
  "description": "Përshkrim opsional",
  "status": "ACTIVE",
  "budgetHours": 200,
  "startDate": "2026-07-01",
  "endDate": "2026-12-31",
  "color": "#10b981"
}
```

**Validation:**
- `name` — kërkohet, max 200 karaktere
- `status` — `ACTIVE` | `ON_HOLD` | `COMPLETED` (default: `ACTIVE`)
- `budgetHours` — numër pozitiv ose null
- `endDate` duhet të jetë pas `startDate`

**Response 201:** Objekt projekti

**Errors:**
- `400` — Emri mungon / validim dështoi
- `403` — Nuk je menaxher

---

#### `PUT /api/projects/[id]` — Përditësim projekti

**Auth:** MANAGER vetëm

**Body:** (të gjitha fushat janë opsionale)
```json
{
  "name": "Emër i ri",
  "status": "COMPLETED",
  "budgetHours": 350
}
```

**Response 200:** Objekt projekti i përditësuar

---

#### `DELETE /api/projects/[id]` — Fshirje projekti

Fshin projektin + të gjitha timesheets + assignments (cascade).

**Auth:** MANAGER vetëm

**Response 200:**
```json
{ "ok": true }
```

---

#### `POST /api/projects/[id]/assign` — Cakto punëtor në projekt

**Auth:** MANAGER vetëm

**Body:**
```json
{
  "employeeId": "cmrh...",
  "role": "Frontend Developer"
}
```

**Response 201:** Objekt assignment

---

#### `DELETE /api/projects/[id]/assign?employeeId=...` — Hiq caktim

**Auth:** MANAGER vetëm

**Response 200:** `{"ok": true}`

---

### 3. Employees

#### `GET /api/employees` — Listë punëtorësh

**Auth:** MANAGER ose EMPLOYEE

**Response 200:**
```json
{
  "employees": [
    {
      "id": "...",
      "firstName": "Ana",
      "lastName": "Krasniqi",
      "fullName": "Ana Krasniqi",
      "email": "ana@oraprojekt.demo",
      "phone": "+383 44 200 201",
      "position": "Frontend Developer",
      "hourlyRate": 18,
      "role": "EMPLOYEE",
      "assignmentsCount": 2,
      "timesheetsCount": 23,
      "totalHours": 145.5,
      "projects": [
        { "id": "...", "name": "Web Rebuild", "color": "#10b981", "role": "Frontend Lead" }
      ]
    }
  ]
}
```

---

#### `POST /api/employees` — Krijim punëtori

**Auth:** MANAGER vetëm

Krijon edhe User account (për hyrje) edhe Employee record.

**Body:**
```json
{
  "firstName": "Arian",
  "lastName": "Krasniqi",
  "email": "arian@oraprojekt.demo",
  "phone": "+383 44 123 456",
  "position": "Backend Developer",
  "hourlyRate": 20,
  "password": "123456",
  "role": "EMPLOYEE"
}
```

**Validation:**
- `firstName`, `lastName` — kërkohen, max 100 karaktere
- `email` — kërkohet, format valid, unik
- `password` — min 4 karaktere (default: `123456`)
- `role` — `MANAGER` | `EMPLOYEE` (default: `EMPLOYEE`)
- `hourlyRate` — numër pozitiv (default: 0)

**Response 201:** Objekt employee

---

#### `PUT /api/employees/[id]` — Përditësim punëtori

**Auth:** MANAGER vetëm

Përditëson edhe Employee edhe User (email, role, name).

---

#### `DELETE /api/employees/[id]` — Fshirje punëtori

Fshin punëtorin + User account + timesheets + assignments (cascade).

**Auth:** MANAGER vetëm

---

### 4. Timesheets

#### `GET /api/timesheets` — Listë regjistrimesh

**Query params:**
- `projectId` — filtro sipas projektit
- `employeeId` — filtro sipas punëtori (managers only)
- `from` — data fillimit (YYYY-MM-DD)
- `to` — data mbarimit (YYYY-MM-DD, përfshirëse)
- `status` — `DRAFT` | `SUBMITTED` | `APPROVED` | `REJECTED`
- `limit` — max 1000 (default: 200)

**Auth:** MANAGER sheh të gjitha; EMPLOYEE sheh vetëm të vetat

**Response 200:**
```json
{
  "timesheets": [
    {
      "id": "...",
      "date": "2026-07-12T00:00:00.000Z",
      "hours": 8,
      "description": "Punë në frontend",
      "status": "SUBMITTED",
      "employee": { "id": "...", "name": "Ana Krasniqi", "position": "Frontend", "hourlyRate": 18 },
      "project": { "id": "...", "name": "Web Rebuild", "color": "#10b981" },
      "cost": 144
    }
  ]
}
```

---

#### `POST /api/timesheets` — Krijim regjistrimi

**Auth:** MANAGER ose EMPLOYEE

- EMPLOYEE mund të caktojë vetëm veten si employee
- EMPLOYEE mund të vendosë vetëm statusin `DRAFT` ose `SUBMITTED`
- MANAGER mund të caktojë cilindo punëtor dhe çdo status

**Body:**
```json
{
  "projectId": "...",
  "employeeId": "...",
  "date": "2026-07-12",
  "hours": 8,
  "description": "Çfarë u punua",
  "status": "DRAFT"
}
```

**Validation:**
- `hours` — mes 0.25 dhe 24
- `date` — format valid, jo e ardhshme
- `projectId` — duhet të ekzistojë në tenant
- `employeeId` — duhet të ekzistojë në tenant

**Response 201:** Objekt timesheet

---

#### `PUT /api/timesheets/[id]` — Përditësim regjistrimi

**Auth:** MANAGER ose EMPLOYEE (vetëm për regjistrimet e veta që nuk janë APPROVED)

- EMPLOYEE nuk mund të vendosë statusin APPROVED ose REJECTED

---

#### `DELETE /api/timesheets/[id]` — Fshirje regjistrimi

**Auth:** MANAGER ose EMPLOYEE (vetëm për DRAFT/SUBMITTED/REJECTED)

---

#### `PATCH /api/timesheets/[id]/status` — Ndrysho statusin

**Auth:** MANAGER vetëm

**Body:**
```json
{ "status": "APPROVED" }
```

Përdoret për workflow-un e aprovimit: SUBMITTED → APPROVED/REJECTED

---

### 5. Reports

#### `GET /api/reports/summary` — Përmbledhje raportesh

**Query params:**
- `from` — data fillimit
- `to` — data mbarimit

**Auth:** MANAGER sheh të gjitha; EMPLOYEE sheh vetëm të vetat

**Response 200:**
```json
{
  "summary": {
    "totalHours": 325.5,
    "totalEntries": 93,
    "activeProjects": 3,
    "totalEmployees": 5,
    "pendingApprovals": 19
  },
  "byStatus": {
    "DRAFT": { "hours": 50, "count": 12 },
    "SUBMITTED": { "hours": 19, "count": 5 },
    "APPROVED": { "hours": 256.5, "count": 76 },
    "REJECTED": { "hours": 0, "count": 0 }
  },
  "byProject": [
    { "projectId": "...", "name": "Web Rebuild", "color": "#10b981", "budgetHours": 320, "hours": 161.6, "entries": 45 }
  ],
  "byEmployee": [
    { "employeeId": "...", "name": "Ana Krasniqi", "position": "Frontend", "hourlyRate": 18, "hours": 80, "entries": 15, "cost": 1440 }
  ],
  "byDate": [
    { "date": "2026-06-12T00:00:00.000Z", "hours": 16, "entries": 4 }
  ]
}
```

---

### 6. Tenant Domains

#### `GET /api/tenant-domains` — Listë domene

**Auth:** MANAGER vetëm

**Response 200:**
```json
{
  "domains": [
    {
      "id": "...",
      "tenantId": "...",
      "domain": "oraprojekt.demo",
      "status": "ACTIVE",
      "verifiedAt": "2026-07-12T...",
      "createdAt": "2026-07-12T..."
    }
  ]
}
```

---

#### `POST /api/tenant-domains` — Shto domen

**Auth:** MANAGER vetëm

**Body:**
```json
{ "domain": "kompania-ks.com" }
```

**Validation:**
- Format domeni valid (p.sh. `kompania-ks.com`)
- Unik brenda sistemit (një domen mund të jetë i lidhur me një tenant)
- Heq automatikisht `http://`, `https://`, `www.`, `@`

**Response 201:** Objekt domain (status: `PENDING`)

---

#### `PATCH /api/tenant-domains/[id]` — Verifiko/Refuzo domen

**Auth:** MANAGER vetëm

**Body:**
```json
{ "status": "ACTIVE" }
```

Statuset: `PENDING` | `ACTIVE` | `REJECTED`

---

#### `DELETE /api/tenant-domains/[id]` — Fshi domen

**Auth:** MANAGER vetëm

---

## Error Responses

Të gjitha endpoints kthejnë errors në formatin:

```json
{
  "error": "Përshkrimi i gabimit në shqip"
}
```

### HTTP Status Codes

| Code | Kuptimi |
|------|---------|
| `200` | OK |
| `201` | Krijuar me sukses |
| `400` | Bad Request (validim dështoi) |
| `401` | I paidentifikuar (sesioni mungon ose skadoi) |
| `403` | Nuk keni leze (p.sh. EMPLOYEE që provon MANAGER veprim) |
| `404` | Nuk u gjet |
| `409` | Konflikt (p.sh. email duplikat) |
| `500` | Gabim i brendshëm i serverit |

---

## Rate Limiting (për production)

| Endpoint | Limit |
|----------|-------|
| `POST /api/auth` | 10 kërkesa/minutë për IP |
| Të tjera | 100 kërkesa/minutë për përdorues |

---

## Webhooks (për versionin e ardhshëm)

| Event | Trigger |
|-------|---------|
| `timesheet.submitted` | Punëtor dërgon orë për aprovim |
| `timesheet.approved` | Menaxher aprovon orë |
| `timesheet.rejected` | Menaxher refuzon orë |
| `project.created` | Projekt i ri i krijuar |
| `employee.invited` | Punëtor i ri i shtuar |

---

## SDK Examples

### JavaScript/TypeScript

```typescript
const api = {
  async login(email: string, password: string) {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const data = await res.json()
    localStorage.setItem('op_token', data.token)
    return data
  },

  async getProjects() {
    const token = localStorage.getItem('op_token')
    const res = await fetch('/api/projects', {
      headers: { 'Authorization': `Bearer ${token}` },
    })
    return res.json()
  },
}
```

### cURL

```bash
# Login
curl -X POST https://oraprojekt.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"menaxher@oraprojekt.demo","password":"123456"}'

# Get projects (replace TOKEN)
curl https://oraprojekt.com/api/projects \
  -H "Authorization: Bearer TOKEN"

# Create timesheet
curl -X POST https://oraprojekt.com/api/timesheets \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"...","date":"2026-07-12","hours":8,"description":"Punë"}'
```

---

## Changelog

| Version | Data | Ndryshimet |
|---------|------|------------|
| 1.0 | 2026-07-12 | Versioni fillestar — auth, projects, employees, timesheets, reports, tenant-domains |
