#!/bin/bash

# Script to enable Firebase Analytics debug mode for iOS
# This adds -FIRDebugEnabled to the Xcode scheme's launch arguments
# Run this after: npx expo prebuild --platform ios

set -e

SCHEME_FILE="ios/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme"

if [ ! -d "ios" ]; then
    echo "❌ iOS directory not found. Run 'npx expo prebuild --platform ios' first."
    exit 1
fi

# Find the scheme file
SCHEME_PATH=$(find ios -name "*.xcscheme" -path "*/xcshareddata/xcschemes/*" | head -1)

if [ -z "$SCHEME_PATH" ]; then
    echo "⚠️  Scheme file not found. Trying user scheme..."
    SCHEME_PATH=$(find ios -name "*.xcscheme" -path "*/xcuserdata/*/xcschemes/*" | head -1)
fi

if [ -z "$SCHEME_PATH" ]; then
    echo "❌ Could not find Xcode scheme file."
    echo "   Make sure you've run: npx expo prebuild --platform ios"
    exit 1
fi

echo "📝 Found scheme: $SCHEME_PATH"

# Check if -FIRDebugEnabled already exists
if grep -q "FIRDebugEnabled" "$SCHEME_PATH"; then
    echo "✅ Firebase Analytics debug mode already enabled in scheme"
    exit 0
fi

# Create backup
cp "$SCHEME_PATH" "${SCHEME_PATH}.backup"
echo "💾 Created backup: ${SCHEME_PATH}.backup"

# Add -FIRDebugEnabled to LaunchAction
# Find the LaunchAction section and add CommandLineArguments if not present
if grep -q "<LaunchAction" "$SCHEME_PATH" && ! grep -q "CommandLineArguments" "$SCHEME_PATH"; then
    # Use sed to add CommandLineArguments after LaunchAction opening tag
    # This is a bit fragile but works for the standard Expo scheme structure
    sed -i '' '/<LaunchAction/,/allowLocationSimulation = "YES">/{
        /allowLocationSimulation = "YES">/a\
      <CommandLineArguments>\
         <CommandLineArgument\
            argument = "-FIRDebugEnabled"\
            isEnabled = "YES">\
         </CommandLineArgument>\
      </CommandLineArguments>
    }' "$SCHEME_PATH"
    
    echo "✅ Added -FIRDebugEnabled to Xcode scheme"
    echo "   Debug mode will be enabled when running from Xcode"
else
    echo "⚠️  Could not automatically add debug flag"
    echo "   Please add -FIRDebugEnabled manually in Xcode:"
    echo "   Product → Scheme → Edit Scheme → Run → Arguments"
fi

