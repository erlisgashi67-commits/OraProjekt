# Vercel Deployment Guide

> Deployimi më i shpejtë dhe më i thjeshtë për OraProjekt

---

## Pse Vercel?

| Avantazh | Vlera |
|----------|-------|
| Zero config | Next.js native, vetëm `vercel` |
| Auto-deploy | Çdo push në main → production |
| Preview URLs | Çdo PR merr URL të veten |
| Edge network | Global CDN falas |
| Free tier | Mjaftueshëm për fillim |
| Auto HTTPS | Let's Encrypt falas |

---

## Hapi 1: Instalo Vercel CLI

```bash
npm install -g vercel
# ose
bun add -g vercel
```

---

## Hapi 2: Login

```bash
vercel login
# Zgjidh: GitHub (ose email)
# Autorizo
```

---

## Hapi 3: Deploy nga Terminal

```bash
cd /home/z/my-project

# Deploy në preview (test)
vercel

# Deploy në production
vercel --prod
```

Në deploy-in e parë, Vercel do të të pyesë:
- **Project name:** OraProjekt
- **Framework:** Next.js (auto-detected)
- **Build command:** `bun run build` (auto)
- **Output directory:** `.next` (auto)

---

## Hapi 4: Konfiguro Environment Variables

### Në Vercel Dashboard:

1. Shko te https://vercel.com/dashboard
2. Selekto projektin OraProjekt
3. Settings → Environment Variables
4. Shto këto:

| Name | Value | Environment |
|------|-------|-------------|
| `DATABASE_URL` | `file:./db/custom.db` ⚠️ | Production + Preview |
| `AUTH_SECRET` | `[generate me openssl rand -base64 32]` | All |
| `AUTH_URL` | `https://oraprojekt.vercel.app` | Production |
| `GOOGLE_CLIENT_ID` | `[your-google-client-id]` | All |
| `GOOGLE_CLIENT_SECRET` | `[your-google-client-secret]` | All |
| `MICROSOFT_CLIENT_ID` | `[your-ms-client-id]` | All |
| `MICROSOFT_CLIENT_SECRET` | `[your-ms-client-secret]` | All |

⚠️ **Vërejtje për DATABASE_URL:** Vercel është serverless, SQLite nuk persiston!
Për production duhet PostgreSQL (shiko seksionin më poshtë).

---

## Hapi 5: Database për Production (PostgreSQL)

Vercel është serverless — SQLite nuk funksionon sepse filesystem është read-only.

### Opsioni A: Vercel Postgres (rekomanduar)

```bash
# Në Vercel dashboard:
# Storage → Create → Postgres
# Krijohet automatikisht
# DATABASE_URL do të injectohet në env vars
```

### Opsioni B: Supabase (falas, e mirë)

1. Shko te https://supabase.com
2. Create project
3. Settings → Database → Connection string
4. Kopjo URL në Vercel env vars:
   ```
   DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
   ```

### Opsioni C: Neon (falas, serverless Postgres)

1. Shko te https://neon.tech
2. Create project
3. Kopjo connection string në Vercel

---

## Hapi 6: Migrim nga SQLite në PostgreSQL

```bash
# 1. Update schema.prisma — ndrysho datasource:
# datasource db {
#   provider = "postgresql"  // ndryshuar nga sqlite
#   url = env("DATABASE_URL")
# }

# 2. Push schema te PostgreSQL i ri
bun run db:push

# 3. Gjenero client
bun run db:generate

# 4. Seed demo data (opsionale)
bun run scripts/seed.ts

# 5. Verifiko
bun run dev
# Testo login + CRUD
```

---

## Hapi 7: Custom Domain

### Blej Domain

1. Shko te https://www.namecheap.com (ose Cloudflare, GoDaddy)
2. Kerko `oraprojekt.com`
3. Blej (~$10-15/vit)

### Konfiguro në Vercel

1. Vercel dashboard → Projects → OraProjekt
2. Settings → Domains
3. Add → `oraprojekt.com`
4. Add → `www.oraprojekt.com` (redirect te pa www)

### Konfiguro DNS te Namecheap

```
Type: A Record
Host: @
Value: 76.76.21.21  (Vercel IP)

Type: CNAME
Host: www
Value: cname.vercel-dns.com
```

### Verifiko

```bash
# Pas 5-30 minuta (DNS propagation)
curl -s -o /dev/null -w "%{http_code}" https://oraprojekt.com/
# Duhet 200
```

---

## Hapi 8: Update Google OAuth Redirect URIs

Pas të pasur domain të vet:

1. Shko te https://console.cloud.google.com/apis/credentials
2. Edit OAuth 2.0 Client
3. Shto Authorized redirect URIs:
   - `https://oraprojekt.com/api/auth/callback/google`
   - `https://www.oraprojekt.com/api/auth/callback/google`
   - `https://oraprojekt.vercel.app/api/auth/callback/google` (preview)
4. Save

---

## Hapi 9: Update capacitor.config.ts

Për mobile app, update production URL:

```ts
// capacitor.config.ts
server: {
  url: 'https://oraprojekt.com',  // ← domain yt
  cleartext: false,
}
```

Pastaj sync + rebuild mobile:
```bash
npx cap sync
```

---

## Hapi 10: Auto-Deploy Setup

Vercel auto-deploy nga GitHub kur push në `main`.

### Branch settings:
- **Production Branch:** `main` → deploys to production
- **Preview Branches:** çdo branch tjetër → preview URLs

### Deploy hooks (opsionale):
1. Vercel → Settings → Git → Deploy Hooks
2. Krijo hook për "Rebuild on DB change"
3. URL mund të përdoret në CI/CD

---

## Hapi 11: Monitoring

### Vercel Analytics (falas)
1. Vercel → Analytics → Enable
2. Shih: Web Vitals, page views, top pages

### Error Tracking me Sentry
```bash
bun add @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
# Verizo Sentry account + DSN
# Shto SENTRY_DSN në Vercel env vars
```

### Uptime Monitoring
- https://uptimerobot.com (falas)
- Ping https://oraprojekt.com çdo 5 min
- Alert në email + Slack kur down

---

## Hapi 12: Verifiko Production

Pas deploy:

```bash
# 1. Homepage
curl -s -o /dev/null -w "Homepage: %{http_code}\n" https://oraprojekt.com/

# 2. API
curl -s -o /dev/null -w "API: %{http_code}\n" https://oraprojekt.com/api/auth

# 3. Login
TOKEN=$(curl -s -X POST https://oraprojekt.com/api/auth \
  -H "Content-Type: application/json" \
  -d '{"email":"menaxher@oraprojekt.demo","password":"123456"}' \
  | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
echo "Token: ${TOKEN:0:30}..."

# 4. Authenticated request
curl -s -o /dev/null -w "Projects API: %{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  https://oraprojekt.com/api/projects
```

---

## Troubleshooting

### Build fails on Vercel
```bash
# Lokalisht:
bun run build
# Nëse kalon lokalisht por dështon në Vercel:
# - Kontrollo Node version (Vercel përdor 18+)
# - Kontrollo env vars
# - Shiko build logs në Vercel dashboard
```

### Database connection fails
```bash
# Verifiko DATABASE_URL është set
# Verifiko PostgreSQL lejon connections nga Vercel (IP whitelist)
# Për Supabase: Settings → Database → Network Restrictions
```

### OAuth redirect mismatch
```
Error: redirect_uri_mismatch
```
→ Shto exact URL në Google Console: `https://oraprojekt.com/api/auth/callback/google`

### 500 errors në production
```bash
# Shiko logs:
vercel logs https://oraprojekt.com
# Ose në dashboard: Project → Logs
```

---

## Cost Estimation

| Item | Cost |
|------|------|
| Vercel Hobby (free tier) | $0 |
| Vercel Pro (kur kesh traffic) | $20/muaj |
| Vercel Postgres (1GB) | $0 (free tier) |
| Supabase (500MB) | $0 (free tier) |
| Domain | $10-15/vit |
| **Total mujor** | **$0-20/muaj** |

---

## Quick Reference Commands

```bash
# Deploy
vercel                    # preview
vercel --prod             # production

# Logs
vercel logs
vercel logs [deployment-url]

# Domains
vercel domains
vercel domains add oraprojekt.com

# Env vars
vercel env add DATABASE_URL
vercel env ls

# Inspect
vercel inspect [deployment-url]
```
