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

# 5. Build with Xcode in Debug configuration
echo -e "${BLUE}🔨 Building with Debug configuration...${NC}"
cd ios

xcodebuild \
  -workspace CoralClash.xcworkspace \
  -scheme CoralClash \
  -configuration Debug \
  -destination generic/platform=iOS \
  -archivePath "$PWD/build/CoralClash.xcarchive" \
  archive \
  CODE_SIGN_STYLE=Automatic \
  DEVELOPMENT_TEAM="FWV22U8U39" \
  DEBUG_INFORMATION_FORMAT=dwarf-with-dsym

# 6. Export IPA with symbols
echo -e "${BLUE}📤 Exporting IPA...${NC}"

cat > ExportOptions.plist <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>development</string>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>signingStyle</key>
    <string>automatic</string>
    <key>teamID</key>
    <string>FWV22U8U39</string>
</dict>
</plist>
EOF

xcodebuild \
  -exportArchive \
  -archivePath "$PWD/build/CoralClash.xcarchive" \
  -exportPath "$PWD/build" \
  -exportOptionsPlist ExportOptions.plist

cd ..

echo ""
echo -e "${GREEN}✅ Debug build complete!${NC}"
echo ""
echo "📍 Build artifacts:"
echo "   IPA: ios/build/CoralClash.ipa"
echo "   Archive (with dSYM): ios/build/CoralClash.xcarchive"
echo ""
echo "📱 To install on device:"
echo "   1. Connect your iPhone"
echo "   2. Open Xcode > Window > Devices and Simulators"
echo "   3. Drag ios/build/CoralClash.ipa to your device"
echo ""
echo "🔍 To symbolicate crashes:"
echo "   The dSYM is in: ios/build/CoralClash.xcarchive/dSYMs/"
echo ""

