#!/bin/bash
# Build Android APK from Next.js static export via Capacitor
set -e

echo "🔧 BudgetApp Android APK Builder"
echo "=================================="

# 1. Install Capacitor if needed
if [ ! -d "node_modules/@capacitor/cli" ]; then
    echo "📦 Installing Capacitor dependencies..."
    npm install @capacitor/core @capacitor/cli @capacitor/android
fi

# 2. Switch to static export config
echo "🔄 Switching to Capacitor build config..."
cp next.config.capacitor.ts next.config.ts
rm -f next.config.mjs next.config.js

# 3. Build static export
echo "🏗️  Building static export..."
npx next build

# 4. Init / sync Capacitor
echo "🤖 Initializing Capacitor Android..."
if [ ! -d "android" ]; then
    npx cap init BudgetApp com.ashbi.budgetapp --web-dir dist
    npx cap add android
fi
npx cap sync android

# 5. Open Android Studio
echo "✅ Sync complete!"
echo ""
echo "Next steps:"
echo "  1. Run: npx cap open android"
echo "  2. In Android Studio: Build → Generate Signed Bundle / APK"
echo "  3. Choose 'APK' → Select your keystore → Build"
echo ""
echo "  Debug APK will be at:"
echo "    android/app/build/outputs/apk/debug/app-debug.apk"
echo "  Release APK will be at:"
echo "    android/app/build/outputs/apk/release/app-release-unsigned.apk"
