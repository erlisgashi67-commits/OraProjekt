#!/bin/bash
# =============================================================================
# OraProjekt — Mobile App Build Script
# =============================================================================
# This script syncs the web app to native projects and builds them.
# Run from the project root.
# =============================================================================

set -e

echo "=========================================="
echo "  OraProjekt — Mobile App Build"
echo "=========================================="

# Check if web URL is configured
WEB_URL=$(grep -oP "url: '([^']+)'" capacitor.config.ts | head -1 | grep -oP "'[^']+'" | tr -d "'")
if [ -z "$WEB_URL" ]; then
  echo "⚠️  No server.url found in capacitor.config.ts"
  echo "   The app will use local web assets instead of a remote URL."
  echo "   Make sure you've deployed the web app and updated the config."
fi

echo ""
echo "📦 Syncing web assets to native projects..."
npx cap sync ios android
echo "✅ Sync complete"

echo ""
echo "=========================================="
echo "  iOS Build"
echo "=========================================="
echo "To build for iOS:"
echo "  1. npx cap open ios"
echo "  2. In Xcode: Product → Archive"
echo "  3. Window → Organizer → Distribute App"
echo ""

echo "=========================================="
echo "  Android Build"
echo "=========================================="
echo "To build for Android:"

# Check if keystore exists
if [ ! -f "android/keystore.properties" ]; then
  echo "⚠️  No keystore.properties found in android/"
  echo "   Create one with:"
  echo "   ORAPROJEKT_UPLOAD_STORE_FILE=/path/to/oraprojekt.keystore"
  echo "   ORAPROJEKT_UPLOAD_STORE_PASSWORD=your-password"
  echo "   ORAPROJEKT_UPLOAD_KEY_ALIAS=oraprojekt"
  echo "   ORAPROJEKT_UPLOAD_KEY_PASSWORD=your-password"
  echo ""
  echo "   Generate keystore with:"
  echo "   keytool -genkey -v -keystore oraprojekt.keystore -alias oraprojekt -keyalg RSA -keysize 2048 -validity 10000"
else
  echo "  Building .aab..."
  cd android
  ./gradlew bundleRelease
  echo "✅ Build complete: app/build/outputs/bundle/release/app-release.aab"
  cd ..
fi

echo ""
echo "=========================================="
echo "  Next Steps"
echo "=========================================="
echo "📖 See docs/DEPLOYMENT.md for full instructions"
echo "🏪 App Store metadata: docs/app-store-metadata.md"
echo "🏪 Play Store metadata: docs/play-store-metadata.md"
echo ""
