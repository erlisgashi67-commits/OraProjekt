# OraProjekt — Free Deployment Guide

> **Kosto totale: $0** — gjithçka falas për fillim

---

## 📊 Përmbledhje — Falas vs Paguar

| Shërbim | Falas? | Alternativa Falas | Kosto Paguar |
|---------|--------|-------------------|--------------|
| **Domain** | ✅ PO | `oraprojekt.vercel.app` ose `oraprojekt.is-a.dev` | $10/vit (oraprojekt.com) |
| **Hosting** | ✅ PO | Vercel Free Tier | $0 |
| **Database** | ✅ PO | Vercel Postgres Free / Supabase Free | $0 |
| **SSL/HTTPS** | ✅ PO | Automatik nga Vercel | $0 |
| **iOS App** | ⚠️ PWA | "Add to Home Screen" nga Safari | $99/vit për App Store |
| **Android App** | ⚠️ APK | Sideload APK + F-Droid | $25 për Play Store |
| **Email** | ✅ PO | Resend Free (100 emails/ditë) | $0 |
| **Monitoring** | ✅ PO | UptimeRobot Free | $0 |
| **Analytics** | ✅ PO | Vercel Analytics Free | $0 |

**Kosto totale mujore: $0**

---

## 🚀 Hapi 1: Deploy në Vercel (FALAS)

### 1.1 Instalo Vercel CLI

```bash
npm install -g vercel
# ose
bun add -g vercel
```

### 1.2 Login (falas)

```bash
vercel login
# Zgjidh: GitHub
# Autorizo
```

### 1.3 Deploy nga terminal

```bash
cd /home/z/my-project

# Deploy në preview (test)
vercel

# Deploy në production (PERGJITHMONË FALAS)
vercel --prod
```

### 1.4 URL Falas që merr

Pas deploy, merr automatikisht:
- **Production:** `https://oraprojekt.vercel.app`
- **Preview:** `https://oraprojekt-abc123.vercel.app`

Kjo është **plotësisht funksionale** me HTTPS falas, global CDN, dhe auto-deploy nga GitHub.

---

## 🌐 Hapi 2: Domain Falas (opsionale, por rekomanduar)

### Opsioni A: Vercel Subdomain (falas, instant)

**URL:** `https://oraprojekt.vercel.app` (tashmë e ke pas deploy)

Për të ndryshuar në diçka më të shkurtër:

```bash
# Në Vercel dashboard:
# https://vercel.com/dashboard → Projects → OraProjekt → Settings → Domains
# Add domain: oraprojekt.vercel.app (ose cilado që dëshiron)
```

✅ **Falas** · ⚡ **Instant** · 🔒 **HTTPS automatik**

### Opsioni B: is-a.dev (falas, për developer)

Domain si `oraprojekt.is-a.dev` — falas për developer.

1. Shko te https://www.is-a.dev/
2. Fork repositorin: https://github.com/is-a-dev/register
3. Krijo file `domains/oraprojekt.json`:
```json
{
  "owner": {
    "username": "erlisgashi67-commits",
    "email": "erlisgashi67@gmail.com"
  },
  "record": {
    "CNAME": "cname.vercel-dns.com"
  }
}
```
4. Krijo Pull Request
5. Pasi aprovohet (1-7 ditë), domain do të punojë

✅ **Falas** · 🌍 **Domain profesional** · ⏱️ **1-7 ditë për aprovim**

### Opsioni C: js.org (falas, për projekte open source)

1. Shko te https://github.com/js-org/js.org
2. Shto domain në `cnames_active.js`:
```js
"oraprojekt": "cname.vercel-dns.com",
```
3. Krijo Pull Request me përshkrim të projektit
4. Domain do të jetë `oraprojekt.js.org`

✅ **Falas** · 🎯 **Open source friendly** · ⏱️ **1-14 ditë**

### Opsioni D: GitHub Pages (falas, për landing page)

Nëse do vetëm një landing page statik:

1. Krijo repo `erlisgashi67-commits.github.io`
2. Vendos landing page statik
3. URL: `https://erlisgashi67-commits.github.io`

✅ **Falas** · ⚡ **Instant**

### Konfiguro Custom Domain në Vercel

Pasi të kesh domain falas (is-a.dev ose js.org):

1. Vercel Dashboard → OraProjekt → Settings → Domains
2. Add → `oraprojekt.is-a.dev`
3. Add → `www.oraprojekt.is-a.dev` (redirect)

---

## 📱 Hapi 3: iOS App FALAS (pa App Store)

### PWA — "Add to Home Screen"

OraProjekt është tashmë PWA (Progressive Web App). Punëtorët mund ta instalojnë falas në iPhone:

#### Si të instalosh në iOS (Safari):
1. Hap `https://oraprojekt.vercel.app` në **Safari** (jo Chrome)
2. Tap butonin **Share** (katror me shigjetë lart)
3. Scroll → **"Add to Home Screen"**
4. Tap **Add**
5. Tani OraProjekt shfaqet si app native në home screen me logon!

#### Çfarë funksionon:
✅ App icon në home screen
✅ Full screen (pa Safari bars)
✅ Offline caching (përmbajtje statike)
✅ Push notifications (me iOS 16.4+)
✅ Splash screen me logon

#### Çfarë NUK funksionon:
❌ App Store presence (duhet $99/vit për këtë)
❌ Background processing
❌ Bluetooth, NFC, etj.

### PWA Update për iOS

Le të shtoj iPhone-specific PWA tweaks:
### PWA tweaks për iOS (tashmë të aplikuara)

Kemi shtuar:
- ✅ `apple-mobile-web-app-capable` — full screen mode
- ✅ `apple-mobile-web-app-status-bar-style: black-translucent`
- ✅ Apple Touch Icon (180×180)
- ✅ Splash screen configuration
- ✅ Service Worker për offline
- ✅ Manifest me shortcuts (Regjistro Orë, Orët e Mia)

---

## 🤖 Hapi 4: Android App FALAS (pa Play Store)

### Opsioni A: PWA (më e lehta — falas)

Ashtu si iOS, Android Chrome mbështet PWA plotësisht:

1. Hap `https://oraprojekt.vercel.app` në **Chrome** (ose Edge)
2. Menu (⋮) → **"Install app"** ose **"Add to Home screen"**
3. Confirm installation
4. App shfaqet në drawer me logon!

✅ **Falas** · ⚡ **Instant** · 🔄 **Auto-update**

### Opsioni B: APK Sideload (falas, për testing/distribution)

Krijo APK që mund të shpërndahet direkt (pa Play Store):

#### Build APK me Capacitor

```bash
# 1. Sync web assets
npx cap sync android

# 2. Open në Android Studio
npx cap open android

# 3. Në Android Studio:
#    Build → Build Bundle(s) / APK(s) → Build APK(s)
#    (jo "Signed Bundle" — sepse ajo kërkon keystore)

# 4. Gjej APK-në:
#    android/app/build/outputs/apk/debug/app-debug.apk
```

#### Distribuo APK-në (falas)

**Metoda 1: Download link nga repo**
```bash
# Upload APK te GitHub Releases
# 1. Shko te: https://github.com/erlisgashi67-commits/OraProjekt/releases/new
# 2. Krijo tag: v1.0.0
# 3. Upload: app-debug.apk
# 4. Publish release
# 5. Link: https://github.com/erlisgashi67-commits/OraProjekt/releases/download/v1.0.0/app-debug.apk
```

**Metoda 2: Hosting falas**
- Upload te https://gofile.io (falas, pa limit)
- Ose te Vercel: vendos APK në `public/` folder

**Metoda 3: QR Code për shpërndarje**
1. Shko te https://www.qr-code-generator.com (falas)
2. Vendos URL të APK-së
3. Shkarko QR code
4. Punëtorët skanojnë me telefon → download → install

#### Si të instalosh APK në Android

1. Skano QR code ose hap link-un
2. Download APK
3. Android do të tregojë "Unknown sources" warning
4. Settings → **"Allow from this source"**
5. Install
6. Open app

### Opsioni C: F-Droid (falas, alternative store)

F-Droid është store falas për apps open-source.

#### Si të publikosh në F-Droid

1. Shko te https://gitlab.com/fdroid
2. Fork repositorin `fdroiddata`
3. Shto file `metadata/com.oraprojekt.app.yml`:

```yaml
Categories:
  - Office
  - Time
License: MIT
AuthorName: erlisgashi67-commits
AuthorEmail: erlisgashi67@gmail.com
SourceCode: https://github.com/erlisgashi67-commits/OraProjekt
IssueTracker: https://github.com/erlisgashi67-commits/OraProjekt/issues

AutoName: OraProjekt
Summary: Menaxhim orësh pune për projekte
Description: |
    Sistem multi-tenant për menaxhimin e orëve të punëtorëve nëpër projekte.

RepoType: git
Repo: https://github.com/erlisgashi67-commits/OraProjekt.git

Builds:
  - versionName: '1.0.0'
    versionCode: 1
    commit: v1.0.0
    subdir: android/app
    gradle:
      - yes

AutoUpdateMode: Version v%v
UpdateCheckMode: Tags
```

4. Krijo Merge Request
5. Pasi aprovet, app do të jetë në F-Droid brenda 1-2 javë

✅ **Falas** · 🌍 **Store presence** · 📱 **Auto-update**

### Opsioni D: Amazon Appstore (falas për developer)

1. Shko te https://developer.amazon.com/appstore
2. Krijo account developer (falas)
3. Submit APK
4. Pasi aprovohet, app do të jetë në Amazon Appstore

✅ **Falas** · 📱 **Në Kindle Fire + Android**

### Opsioni E: Aptoide (falas, alternative store)

1. Shko te https://www.aptoide.com
2. Sign up si developer (falas)
3. Upload APK
4. Aprovim i shpejtë (1-3 ditë)

✅ **Falas** · ⚡ **Aprovim i shpejtë**

---

## 📊 Krahasim: Falas vs Paguar

| Funksion | PWA (falas) | APK Sideload (falas) | F-Droid (falas) | Play Store ($25) | App Store ($99) |
|----------|-------------|---------------------|-----------------|------------------|-----------------|
| **Install** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **App icon** | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Offline** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Auto-update** | ✅ | ❌ | ✅ | ✅ | ✅ |
| **Push notif** | ✅ iOS 16.4+ | ⚠️ Native | ⚠️ Native | ⚠️ Native | ⚠️ Native |
| **Discoverability** | ❌ | ❌ | ⚠️ | ✅ | ✅ |
| **Trust/credibility** | ❌ | ❌ | ⚠️ | ✅ | ✅ |
| **Cost** | $0 | $0 | $0 | $25 | $99/vit |

---

## 💡 Strategjia Rekomanduar (FALAS)

### Fazë 1: Fillimi (tani, $0)
1. Deploy në Vercel → `oraprojekt.vercel.app`
2. PWA për iOS + Android (sufficient për MVP)
3. APK për Android testing
4. Domain falas nga is-a.dev

### Fazë 2: Rritja (pas 50 users aktivë)
- Blej domain `.com` ($10/vit) — kur të kesh buxhet
- Submit te F-Droid (falas) — për credibility
- Submit te Amazon Appstore (falas)

### Fazë 3: Komercializimi (kur ke revenue)
- Google Play Console ($25 një herë)
- Apple Developer ($99/vit)
- Domain premium

---

## 🛠️ Setup Komplet Falas — Script

```bash
#!/bin/bash
# Ekzekuto këtë për setup komplet falas

echo "🚀 OraProjekt Free Setup"

# 1. Deploy në Vercel
npm install -g vercel
vercel --prod

# 2. Verifiko
curl -s -o /dev/null -w "Production: %{http_code}\n" https://oraprojekt.vercel.app/

# 3. Build APK për Android (opsionale)
npx cap sync android
cd android && ./gradlew assembleDebug
cp app/build/outputs/apk/debug/app-debug.apk ../public/oraprojekt.apk
cd ..

echo ""
echo "✅ Setup komplet!"
echo ""
echo "📍 Web App: https://oraprojekt.vercel.app"
echo "📱 PWA: Hap në Safari/Chrome → Add to Home Screen"
echo "📦 APK: https://oraprojekt.vercel.app/oraprojekt.apk"
echo ""
echo "Shpërnda këtë link me punëtorët:"
echo "  https://oraprojekt.vercel.app"
```

---

## ❓ Pyetje të Shpeshta

### A mund t'i bëj app store listings falas?
**Jo.** Apple dhe Google kërkojnë pagesë. Por PWA + F-Droid + APK sideload janë falas dhe funksionojnë pothuajse njëlloj.

### A do të kenë users besim te app pa App Store/Play Store?
PWA-të janë shumë të zakonshme (Twitter Lite, Instagram Lite, etj.). Për B2B (kompani që përdorin OraProjekt), PWA është krejtësisht normale.

### Sa kushton të kesh gjithçka falas?
**$0** — Vercel free, Supabase free, is-a.dev free, F-Droid free, PWA free.

### Kur duhet të paguaj?
Kur ke:
- 50+ users aktivë (Vercel Pro: $20/muaj)
- Domain premium (.com: $10/vit)
- Need for App Store presence ($99/vit Apple, $25 Google)

### A funksionon offline?
PO! PWA-ja jonë ka Service Worker që cache-on statiken. API requests kërkojnë internet, por app-i hapet dhe punëtorët mund të shohin historikun offline.
