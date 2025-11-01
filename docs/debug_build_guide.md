# Debug Build Guide

## Overview

This guide helps you build a debug version of the app with full debug symbols (dSYM) to get detailed crash reports with file names and line numbers.

## Why Debug Builds?

**Release builds** (like what goes to TestFlight):

- Symbols are stripped → crash reports show memory addresses
- JavaScript is minified and optimized
- Harder to debug crashes

**Debug builds**:

- Include full debug symbols (dSYM files)
- Crash reports show actual function names and line numbers
- JavaScript source maps included
- Easier to identify exact crash location

## Option 1: Quick Local Build (Recommended)

Use the automated script for the fastest debug build:

```bash
./scripts/build-debug-ios.sh
```

**What it does:**

1. Cleans previous builds
2. Runs `expo prebuild` for iOS
3. Installs CocoaPods
4. Bundles JavaScript in **development mode** (with source maps)
5. Builds with Xcode in **Debug configuration**
6. Exports IPA with debug symbols included

**Output:**

- `ios/build/CoralClash.ipa` - Debug IPA for installation
- `ios/build/CoralClash.xcarchive/dSYMs/` - Debug symbols for symbolication

**Install on device:**

```bash
# Option 1: Via Xcode
# 1. Connect iPhone
# 2. Open Xcode > Window > Devices and Simulators
# 3. Drag ios/build/CoralClash.ipa to your device

# Option 2: Via command line
xcrun devicectl device install app --device <DEVICE_ID> ios/build/CoralClash.ipa
```

## Option 2: Using Fastlane

Build using the new `debug` lane:

```bash
# First, prebuild and bundle JavaScript in dev mode
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
npx expo export:embed --eager --platform ios --dev true

# Then build with Fastlane
bundle exec fastlane ios debug
```

**Output:**

- `build/ios/CoralClash-Debug.ipa`
- `build/ios/CoralClash.app.dSYM.zip`

## What Changes in Debug Mode?

### JavaScript Bundle

```bash
# Release (what CI uses):
npx expo export:embed --eager --platform ios --dev false

# Debug (what you should use):
npx expo export:embed --eager --platform ios --dev true
```

### Build Configuration

- **Release**: Optimized, symbols stripped, harder to debug
- **Debug**: Unoptimized, symbols included, exact line numbers in crashes

### Code Signing

- **Release**: Uses App Store provisioning profile
- **Debug**: Uses Development provisioning profile (can install on registered devices)

## Reading Debug Crash Reports

With a debug build, crash reports will show:

```
Thread 0 Crashed:
0   CoralClash                      0x0000000102a3b4d0 -[GoogleSignin hasPlayServices:] + 48 (AuthContext.js:168)
1   CoralClash                      0x0000000102a3a1c8 signInWithGoogle + 164 (AuthContext.js:162)
2   React                           0x0000000103c12000 RCTCallableJSModules + 92
```

Notice:

- ✅ Function names: `signInWithGoogle`
- ✅ File names: `AuthContext.js`
- ✅ Line numbers: `168`, `162`

Compare to release builds:

```
Thread 0 Crashed:
0   CoralClash                      0x0000000102a3b4d0 (imageOffset:2139808)
1   CoralClash                      0x0000000102a3a1c8 (imageOffset:2136248)
```

No function names, no files, no line numbers! 😢

## Symbolicating Release Crashes (Advanced)

If you already have a release crash (like `CoralClash-2025-11-01-064724.ips`) and want to symbolicate it:

### 1. Get the dSYM from CI

The CI workflow should save the dSYM as an artifact. Download it from GitHub Actions:

- Go to the workflow run that built the crashing version
- Download `ios-build-preview` or `ios-build-production` artifact
- Extract the `.app.dSYM` file

### 2. Use Xcode to symbolicate

```bash
# Symbolicate using Xcode command line tools
xcrun atos -arch arm64 -o /path/to/CoralClash.app.dSYM/Contents/Resources/DWARF/CoralClash -l 0x0000000100000000 0x0000000102a3b4d0
```

Or use Xcode GUI:

1. Window > Organizer > Crashes
2. Right-click crash log > "Import Crash Report..."
3. Xcode will auto-symbolicate if it finds matching dSYM

## Testing the Fix

After building and installing the debug version:

1. **Reproduce the crash** - Try Google Sign-In
2. **Get the crash report**:
   - Xcode > Window > Devices and Simulators > View Device Logs
   - Or Settings > Privacy & Security > Analytics & Improvements > Analytics Data
3. **Read the symbolicated crash** - Should show exact file/line numbers

## Environment Variables in Debug Builds

The debug script bundles with `--dev true`, which means:

- Environment variables are read at **runtime** from your local `.env` files
- Changes to `.env` don't require rebuild (unlike release builds)
- Hot reloading works (if you run metro bundler separately)

## Cleanup

After debugging, remove the debug build from your device and reinstall the release version:

```bash
# Remove old build artifacts
rm -rf ios/build
rm -rf build/ios

# Rebuild release version (optional)
npx expo prebuild --platform ios --clean
cd ios && pod install && cd ..
npx expo export:embed --eager --platform ios --dev false
bundle exec fastlane ios beta
```

## Troubleshooting

### "No provisioning profile found"

Run Fastlane Match to download development profiles:

```bash
bundle exec fastlane match development --readonly
```

### "Failed to code sign"

Make sure your device is registered in Apple Developer:

1. Get device UDID: Xcode > Window > Devices
2. Add to Apple Developer portal
3. Run: `bundle exec fastlane match development --force_for_new_devices`

### "JavaScript bundle not found"

Make sure you ran `expo export:embed` before building:

```bash
npx expo export:embed --eager --platform ios --dev true
```

## Related Documentation

- [Google Sign-In iOS Crash Fix](./google_signin_ios_crash_fix.md)
- [Native Build & Deployment](./native_build_deployment.md)
- [Deployment Quick Reference](./deployment_quick_reference.md)
