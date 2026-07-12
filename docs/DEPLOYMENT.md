# OraProjekt — App Store & Play Store Deployment Guide

This guide walks you through building and publishing OraProjekt to the Apple App Store and Google Play Store.

---

## Prerequisites

### Apple App Store (iOS)
- [ ] Mac computer (required for Xcode)
- [ ] Apple Developer Account ($99/year) — [enroll here](https://developer.apple.com/programs/)
- [ ] Xcode 15+ installed
- [ ] CocoaPods installed (`sudo gem install cocoapods`)

### Google Play Store (Android)
- [ ] Google Play Console account ($25 one-time) — [sign up here](https://play.google.com/console)
- [ ] Android Studio installed (or just the build tools)
- [ ] Java JDK 17+

### Both
- [ ] Web app deployed to production (e.g., https://oraprojekt.com)
- [ ] App icons generated (already done in `assets/`)

---

## Step 1: Deploy the Web App

The mobile app loads the web app via WebView. Deploy the Next.js app first:

```bash
# Option A: Vercel (easiest)
npm i -g vercel
vercel --prod

# Option B: VPS with Docker
docker-compose up -d

# Option C: VPS manual
bun run build
pm2 start "bun run start" --name oraprojekt
```

Update `capacitor.config.ts` with your production URL:
```ts
server: {
  url: 'https://your-domain.com',  // ← change this
}
```

---

## Step 2: Build the Mobile App

### Sync web assets to native projects:
```bash
# Copy config + assets to native projects
npx cap sync
```

---

## Step 3: iOS — Build & Submit to App Store

### 3.1 Open in Xcode
```bash
npx cap open ios
```

### 3.2 Configure Signing in Xcode
1. Select the "App" target
2. Go to "Signing & Capabilities" tab
3. Select your Team (Apple Developer account)
4. Xcode will auto-generate a provisioning profile
5. Set:
   - **Bundle Identifier:** `com.oraprojekt.app`
   - **Version:** `1.0.0`
   - **Build:** `1`

### 3.3 Build for Release
```bash
# In Xcode:
# 1. Product → Archive
# 2. Wait for archive to complete
# 3. Window → Organizer → select latest archive
# 4. Click "Distribute App" → "App Store Connect"
```

### 3.4 Upload to App Store Connect
1. Follow the Xcode distribution wizard
2. Select "Upload" (not "Export")
3. Wait for upload + processing (10-30 minutes)

### 3.5 Submit for Review
1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Create a new App:
   - **Name:** OraProjekt
   - **Primary Language:** Albanian
   - **Bundle ID:** com.oraprojekt.app
   - **SKU:** oraprojekt2026
3. Fill in app information from `docs/app-store-metadata.md`
4. Add screenshots (see below)
5. Select the build you uploaded
6. Submit for review

### 3.6 iOS Screenshots Needed
Generate screenshots for these device sizes:
- **iPhone 6.7"** (iPhone 15 Pro Max) — 1290 × 2796
- **iPhone 6.5"** (iPhone 14 Plus) — 1242 × 2688
- **iPad 12.9"** (iPad Pro) — 2048 × 2732

Take screenshots of:
1. Login screen
2. Dashboard
3. Projects list
4. Log time dialog
5. Reports with charts
6. Settings page

---

## Step 4: Android — Build & Submit to Play Store

### 4.1 Generate Upload Keystore
```bash
keytool -genkey -v \
  -keystore oraprojekt.keystore \
  -alias oraprojekt \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000
```

Save this file securely — you'll need it for every update!

### 4.2 Configure Signing
Create `android/keystore.properties`:
```properties
ORAPROJEKT_UPLOAD_STORE_FILE=/path/to/oraprojekt.keystore
ORAPROJEKT_UPLOAD_STORE_PASSWORD=your-store-password
ORAPROJEKT_UPLOAD_KEY_ALIAS=oraprojekt
ORAPROJEKT_UPLOAD_KEY_PASSWORD=your-key-password
```

Add to `android/build.gradle` (project-level):
```gradle
ext {
    // ... existing config
}
// Load keystore properties
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('keystore.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
```

### 4.3 Build App Bundle (.aab)
```bash
# Open in Android Studio
npx cap open android

# In Android Studio:
# 1. Build → Generate Signed Bundle / APK
# 2. Select "Android App Bundle"
# 3. Select your keystore
# 4. Select "release" build variant
# 5. Click "Finish"
```

Or via command line:
```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### 4.4 Upload to Play Console
1. Go to [Google Play Console](https://play.google.com/console)
2. Create a new app:
   - **App name:** OraProjekt
   - **Default language:** Albanian
   - **App type:** App
   - **Pricing:** Free
3. Complete the "Dashboard" checklist:
   - App access (add demo credentials)
   - Ads: No
   - Content rating: Fill questionnaire
   - Target audience: 18+
   - News app: No
   - Data safety: Fill form (see `docs/play-store-metadata.md`)
   - Government apps: No
   - Financial features: No
   - Privacy Policy URL
4. Go to "Production" → "Create release"
5. Upload the `.aab` file
6. Add release notes
7. Review and roll out

### 4.5 Android Screenshots Needed
Generate screenshots for:
- **Phone screenshots:** 16:9 or 9:16, min 320px, max 3840px
- **Tablet screenshots:** optional but recommended

Minimum 2 screenshots, maximum 8. Same screens as iOS.

---

## Step 5: App Store Assets

### Icons (already generated)
- **iOS:** `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- **Android:** `android/app/src/main/res/mipmap-*/`

### Screenshots
Use the screenshots in `docs/screenshots/` as a base. For store listings:
- **iOS:** Requires specific pixel dimensions (see Step 3.6)
- **Android:** More flexible dimensions

You can resize using:
```bash
# Example: resize for iPhone 6.7"
sips -z 2796 1290 docs/screenshots/02-dashboard.png
```

---

## Step 6: Privacy Policy

Create a privacy policy page at `https://oraprojekt.com/privacy`. Use this template:

```html
<h1>Privacy Policy for OraProjekt</h1>
<p>Last updated: 2026-07-12</p>

<h2>1. Data We Collect</h2>
<ul>
  <li>Email address (for authentication)</li>
  <li>Name (for profile display)</li>
  <li>Work hours and project assignments</li>
</ul>

<h2>2. How We Use Data</h2>
<ul>
  <li>Account management and authentication</li>
  <li>Timesheet management and reporting</li>
  <li>Multi-tenant isolation (your data is separated from other organizations)</li>
</ul>

<h2>3. Data Security</h2>
<ul>
  <li>All data in transit: HTTPS/TLS encryption</li>
  <li>All data at rest: encrypted database</li>
  <li>Authentication: HMAC-SHA256 signed tokens</li>
  <li>No third-party data sharing</li>
</ul>

<h2>4. Data Retention</h2>
<p>Data is retained while your account is active. You can request deletion at any time.</p>

<h2>5. Your Rights</h2>
<ul>
  <li>Access your data</li>
  <li>Request data export (CSV)</li>
  <li>Request data deletion</li>
</ul>

<h2>6. Contact</h2>
<p>Email: privacy@oraprojekt.com</p>
```

---

## Step 7: Fastlane (Optional — Automated Deployments)

For automated screenshots and deployments, install [Fastlane](https://fastlane.tools):

```bash
# Install
brew install fastlane

# iOS setup
cd ios/App
fastlane init

# Android setup
cd ../../android
fastlane init
```

Create `fastlane/Fastfile`:
```ruby
default_platform(:ios)

platform :ios do
  desc "Upload to App Store Connect"
  lane :release do
    build_app(scheme: "App")
    upload_to_app_store(
      skip_screenshots: true,
      skip_metadata: false,
      metadata: "./fastlane/metadata"
    )
  end
end

platform :android do
  desc "Upload to Google Play"
  lane :release do
    upload_to_play_store(
      track: 'production',
      aab: '../android/app/build/outputs/bundle/release/app-release.aab'
    )
  end
end
```

---

## Quick Reference

| Item | iOS | Android |
|------|-----|---------|
| Developer Account | $99/year | $25 one-time |
| Build Tool | Xcode | Android Studio |
| Output File | .ipa | .aab |
| Review Time | 1-3 days | 1-7 days |
| Max App Size | 4 GB | 150 MB (recommended) |
| Min OS Version | iOS 13+ | Android 6.0+ |

---

## Troubleshooting

### iOS: "Unable to verify App Store distribution"
- Ensure you have a valid Apple Developer account
- Check signing certificates in Xcode
- Try: `Product → Clean Build Folder` then re-Archive

### Android: "Upload key certificate is not valid"
- Ensure you're using the same keystore for all updates
- If lost, you must reset the upload key via Play Console

### App shows blank screen
- Verify the web app is deployed and accessible
- Check `capacitor.config.ts` → `server.url` is correct
- Ensure HTTPS is enabled (no HTTP for production)

### OAuth doesn't work in the app
- Add your app's redirect URI to Google Console:
  - iOS: `com.oraprojekt.app:/api/auth/callback/google`
  - Android: `com.oraprojekt.app:/api/auth/callback/google`
- Also add the web redirect: `https://oraprojekt.com/api/auth/callback/google`

---

## File Locations

```
OraProjekt/
├── capacitor.config.ts          # Capacitor config (web URL, plugins)
├── assets/                      # Source icons (logo.png)
├── ios/                         # iOS Xcode project
│   └── App/App/
│       ├── Info.plist           # iOS app configuration
│       └── Assets.xcassets/     # App icons + splash screens
├── android/                     # Android Studio project
│   └── app/
│       ├── build.gradle         # Build config + signing
│       └── src/main/
│           ├── AndroidManifest.xml  # App permissions
│           └── res/             # Icons, splash, strings
└── docs/
    ├── app-store-metadata.md    # App Store listing text
    ├── play-store-metadata.md   # Play Store listing text
    └── DEPLOYMENT.md            # This file
```
