#!/bin/bash
set -e

echo "🔨 Building iOS Debug Build with Symbols"
echo "========================================="

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Clean previous builds
echo -e "${BLUE}🧹 Cleaning previous builds...${NC}"
rm -rf ios/build
rm -rf build/ios

# 2. Run prebuild
echo -e "${BLUE}📦 Running expo prebuild...${NC}"
npx expo prebuild --platform ios --clean

# 3. Install pods
echo -e "${BLUE}📱 Installing CocoaPods...${NC}"
cd ios
pod install
cd ..

# 4. Bundle JavaScript in DEVELOPMENT mode (with source maps)
echo -e "${BLUE}📦 Bundling JavaScript in DEVELOPMENT mode...${NC}"
npx expo export:embed --eager --platform ios --dev true

# 5. Build with Fastlane
echo -e "${BLUE}🔨 Building debug IPA with Fastlane...${NC}"
bundle exec fastlane ios debug

echo ""
echo -e "${GREEN}✅ Debug build complete!${NC}"
echo ""
echo "📍 Build artifacts:"
echo "   IPA: build/ios/CoralClash-Debug.ipa"
echo "   dSYM: build/ios/CoralClash.app.dSYM.zip"
echo ""
echo "📱 To install on device:"
echo "   1. Connect your iPhone"
echo "   2. Open Xcode > Window > Devices and Simulators"
echo "   3. Drag build/ios/CoralClash-Debug.ipa to your device"
echo ""
echo "🔍 Crash reports will now show exact file names and line numbers!"
echo ""

