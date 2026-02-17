#!/bin/bash
# Quick Setup Script for iOS Native Build

echo "🚀 Construction App - iOS Native Build Setup"
echo "=============================================="
echo ""

# Navigate to mobile app directory
cd /Volumes/Programming/FINAL-PROJECT/FULL-STACK/Construction/mobile-app

echo "✅ Configuration files created:"
echo "   - eas.json (build configuration)"
echo "   - app.json (updated with bundle ID)"
echo "   - expo-dev-client installed"
echo ""

echo "📱 Detected iPhone:"
xcrun devicectl list devices | grep "available" | grep "iPhone"
echo ""

echo "Next Steps:"
echo "==========="
echo ""
echo "1️⃣  Login to EAS (Expo):"
echo "   eas login"
echo ""
echo "2️⃣  Register your iPhone:"
echo "   eas device:create"
echo ""
echo "3️⃣  Build the app (RECOMMENDED - Cloud Build):"
echo "   eas build --profile development --platform ios"
echo ""
echo "   After build completes (~10-15 min):"
echo "   - Open the download link on your iPhone"
echo "   - Tap 'Install'"
echo ""
echo "4️⃣  Launch the app on iPhone and enter:"
echo "   exp://192.168.0.112:8081"
echo ""
echo "📖 Full guide: /Users/jitendrakhadka/.gemini/antigravity/brain/9b066823-8fa7-454b-a871-965d7159513d/native_ios_install.md"
echo ""
echo "Ready to start? Run: eas login"
