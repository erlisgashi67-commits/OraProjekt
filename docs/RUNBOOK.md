# Runbook — Operacionet e Përditshme

> **Space:** OP Engineering
> **Parent Page:** Home

---

## 1. Procedurat e Rregullta

### 1.1 Deploy në Production (10 minuta)

```bash
# 1. Në main branch, verifiko gjithçka kalon
bun run lint
bun run build

# 2. Merge PR në GitHub (krijo PR → review → merge)

# 3. Vercel auto-deploy nga main branch
# Ose manual:
vercel --prod

# 4. Verifiko production
curl -s -o /dev/null -w "%{http_code}" https://oraprojekt.com/
# Duhet të jetë 200

# 5. Testo login
curl -s -X POST https://oraprojekt.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"menaxher@oraprojekt.demo","password":"123456"}'
# Duhet të kthejë token
```

### 1.2 Backup Database (ditor, automatik)

```bash
# Manualisht (nëse duhet):
cp db/custom.db backups/custom_$(date +%Y%m%d_%H%M%S).db

# Për PostgreSQL:
pg_dump $DATABASE_URL > backups/oraprojekt_$(date +%Y%m%d).sql

# Restore:
psql $DATABASE_URL < backups/oraprojekt_20260712.sql
```

**Schedule:** Cron job çdo ditë në 02:00 UTC
**Retention:** 30 ditë
**Location:** `backups/` ose S3/Backblaze

### 1.3 Update Dependencies (javore)

```bash
# Kontrollo për updates
bun update

# Ose specifike:
bun add next@latest
bun add prisma@latest

# Pas update:
bun run lint
bun run build
bun run db:generate

# Testo para commit
```

### 1.4 Monitor Logs (i përditshëm)

```bash
# Vercel logs
vercel logs https://oraprojekt.com

# Ose VPS:
pm2 logs oraprojekt --lines 100

# Kërko errors:
grep -i "error\|exception\|fail" /var/log/oraprojekt.log | tail -20
```

---

## 2. Incident Response

### 2.1 Server Down (Severity: CRITICAL)

**Simptomat:** Site nuk hapet, 502/503 errors

**Hapat:**

```bash
# 1. Verifiko status
curl -s -o /dev/null -w "%{http_code}" https://oraprojekt.com/
# Nëse 000 → server down

# 2. Në VPS, kontrollo process
ssh user@server
pm2 status
# Nëse stopped:
pm2 restart oraprojekt

# 3. Kontrollo logs
pm2 logs oraprojekt --lines 50

# 4. Nëse OOM (Out of Memory):
free -h
# Nëse memory full:
pm2 restart oraprojekt
# Konsidero upgrade VPS

# 5. Nëse database issue:
sqlite3 db/custom.db "SELECT count(*) FROM User;"
# Nëse error → restore from backup

# 6. Komuniko në Slack #oraprojekt-incidents
```

**Escalation:** Nëse nuk fix brenda 30 min → telefono senior dev

### 2.2 Auth Broken (Severity: HIGH)

**Simptomat:** Users nuk mund të hyjnë, 401 errors

```bash
# 1. Testo login
curl -X POST https://oraprojekt.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"menaxher@oraprojekt.demo","password":"123456"}'

# 2. Nëse 500 error → kontrollo logs
# 3. Nëse 401 → kontrollo AUTH_SECRET
echo $AUTH_SECRET  # duhet të jetë set

# 4. Nëse OAuth broken → kontrollo GOOGLE_CLIENT_ID/SECRET
# 5. Restart server:
pm2 restart oraprojekt
```

### 2.3 Database Corruption (Severity: CRITICAL)

```bash
# 1. Backup aktual menjëherë
cp db/custom.db backups/corrupt_$(date +%Y%m%d).db

# 2. Verifiko integritetin
sqlite3 db/custom.db "PRAGMA integrity_check;"

# 3. Nëse korrupt:
# Restore nga backup i fundit i mirë
ls -la backups/  # gjej më të fundit
cp backups/custom_20260711_020000.db db/custom.db
pm2 restart oraprojekt

# 4. Njofto users për ndonjë humbje të dhënash
```

### 2.4 Tenant Data Leak (Severity: CRITICAL)

**Simptomat:** User sheh të dhëna nga tenant tjetër

```bash
# 1. IMMEDIATE: Bloko user-in
# 2. Hetim:
#   - Cila query ktheu të dhëna të gabuara?
#   - A mungon tenantId në WHERE clause?
# 3. Fix code + deploy hotfix
# 4. Audit log për të parë qasje
# 5. Njofto tenant-in e prekur
# 6. Post-mortem document
```

---

## 3. Maintenance

### 3.1 Add New Tenant

```bash
# 1. Krijo tenant në DB
sqlite3 db/custom.db "INSERT INTO Tenant (id, name, subdomain, plan) VALUES ('tenant-xyz', 'Kompania XYZ', 'xyz', 'PRO');"

# 2. Shto domain mapping
sqlite3 db/custom.db "INSERT INTO TenantDomain (id, tenantId, domain, status) VALUES ('domain-1', 'tenant-xyz', 'kompania-xyz.com', 'ACTIVE');"

# 3. Krijo manager user
# (Përmes UI si admin ekzistues)

# 4. Verifiko
curl -s -X POST https://oraprojekt.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"manager@kompania-xyz.com","password":"123456"}'
```

### 3.2 Delete Tenant (GDPR Right to Erasure)

```bash
# ATTENTION: Ky fshin të GJITHA të dhënat e tenant-it!

# 1. Backup i pari
cp db/custom.db backups/pre-deletion_$(date +%Y%m%d).db

# 2. Fshi të gjitha
sqlite3 db/custom.db <<EOF
DELETE FROM Timesheet WHERE tenantId = 'tenant-xyz';
DELETE FROM ProjectAssignment WHERE projectId IN (SELECT id FROM Project WHERE tenantId = 'tenant-xyz');
DELETE FROM Project WHERE tenantId = 'tenant-xyz';
DELETE FROM Employee WHERE tenantId = 'tenant-xyz';
DELETE FROM TenantDomain WHERE tenantId = 'tenant-xyz';
DELETE FROM User WHERE tenantId = 'tenant-xyz';
DELETE FROM Tenant WHERE id = 'tenant-xyz';
EOF

# 3. Verifiko fshirja
sqlite3 db/custom.db "SELECT count(*) FROM User WHERE tenantId = 'tenant-xyz';"
# Duhet të jetë 0

# 4. Restart
pm2 restart oraprojekt
```

### 3.3 Rotate AUTH_SECRET

```bash
# ATTENTION: Ky logon jashtë të GJITHË users!

# 1. Gjenero secret të ri
NEW_SECRET=$(openssl rand -base64 32)
echo "New secret: $NEW_SECRET"

# 2. Update .env (ose Vercel env vars)
# AUTH_SECRET=$NEW_SECRET

# 3. Restart server
pm2 restart oraprojekt

# 4. Users do të duhet të login përsëri
```

---

## 4. Monitoring

### 4.1 Health Check Endpoint (planned)

```bash
curl https://oraprojekt.com/api/health
# {"status":"ok","database":"connected","uptime":3600}
```

### 4.2 Metrics për të monitoruar

| Metric | Threshold | Action |
|--------|-----------|--------|
| Response time | > 2s | Investigate slow queries |
| Error rate (5xx) | > 1% | Check logs immediately |
| Memory usage | > 80% | Restart / upgrade |
| Disk space | > 90% | Clean up / expand |
| Failed logins | > 50/min | Possible brute force |
| API rate | > 1000 req/min | Consider rate limiting |

### 4.3 Uptime Monitoring

- **UptimeRobot** (free) — ping çdo 5 minuta
- **Pingdom** — për monitoring më të detajuar
- Alert në email + Slack kur down

---

## 5. Security Procedures

### 5.1 Security Incident

1. **Isoloni** — blono qasje nëse e domosdoshme
2. **Dokumentoni** — çfarë, kur, si
3. **Hetoni** — root cause analysis
4. **Fix** — patch + deploy
5. **Komunikoni** — njofto users të prekur
6. **Post-mortem** — dokumentim + parandalim

### 5.2 Password Reset për User

```bash
# Generate password të ri
NEW_PASS=$(openssl rand -base64 12)

# Update në DB
sqlite3 db/custom.db "UPDATE User SET password = '$NEW_PASS' WHERE email = 'user@example.com';"

# Dërgo email me password të ri (manualisht ose përmes script)
```

### 5.3 Audit Log Query

```sql
-- Kush hyri kur
SELECT * FROM AuditLog WHERE action = 'LOGIN' ORDER BY timestamp DESC LIMIT 50;

-- Ndryshimet në një project
SELECT * FROM AuditLog WHERE entity = 'Project' AND entityId = 'proj-123';

-- Aktiviteti i një user-i
SELECT * FROM AuditLog WHERE userId = 'user-123' ORDER BY timestamp DESC;
```

---

## 6. Emergency Contacts

| Rol | Emri | Kontakt |
|-----|------|---------|
| Tech Lead | Erlis Gashi | erlis@oraprojekt.com |
| DevOps | [TBD] | devops@oraprojekt.com |
| Hosting | Vercel/VPS | support@... |
| Domain | Namecheap | support@namecheap.com |

---

## 7. Post-Mortem Template

```markdown
# Post-Mortem: [Incident Name]

**Date:** 2026-07-12
**Severity:** P0/P1/P2
**Duration:** 2 hours
**Affected:** 50 users

## Summary
[Breve përshkrimi]

## Timeline
- 14:00 — User raporton issue
- 14:05 — On-call verifikon
- 14:15 — Root cause identifikuar
- 14:30 — Fix deployed
- 15:00 — Verifikuar i zgjidhur

## Root Cause
[Pse ndodhi]

## Impact
[Çfarë u prek]

## What Went Well
- [X] Detectuar shpejt

## What Went Wrong
- [X] Monitoring nuk alertoi

## Action Items
- [ ] Shto alert për [X]
- [ ] Dokumentim në runbook
- [ ] Test për [X]
```
