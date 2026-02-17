#!/bin/bash
# Quick iPhone Connection Fix

echo "🔍 Checking iPhone Connection Status..."
echo ""

# Check connected devices
echo "Connected Devices:"
xcrun devicectl list devices

echo ""
echo "=========================================="
echo "Quick Fixes to Try:"
echo "=========================================="
echo ""
echo "1️⃣  Make sure iPhone is UNLOCKED"
echo ""
echo "2️⃣  In Xcode:"
echo "   - Go to: Window → Devices and Simulators (⌘⇧2)"
echo "   - Check if iPhone appears"
echo "   - If yellow dot, click for details"
echo ""
echo "3️⃣  On iPhone:"
echo "   - Settings → Privacy & Security → Developer Mode"
echo "   - Turn it ON (will restart iPhone)"
echo ""
echo "4️⃣  If 'unavailable' status:"
echo "   - Unplug iPhone"
echo "   - Unlock iPhone"
echo "   - Replug USB cable"
echo "   - Tap 'Trust' when prompted"
echo ""
echo "5️⃣  Restart Xcode:"
echo "   - Quit Xcode (⌘Q)"
echo "   - Reopen and try again"
echo ""
echo "📖 Full guide: troubleshooting_iphone.md"
