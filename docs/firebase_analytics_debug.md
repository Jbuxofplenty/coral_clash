# Firebase Analytics Debug Mode Setup

This guide explains how to enable debug mode for Firebase Analytics on iOS and Android to test events in real-time using DebugView.

## Prerequisites

- ✅ `@react-native-firebase/app` and `@react-native-firebase/analytics` installed
- ✅ `GoogleService-Info.plist` configured for iOS
- ✅ `google-services.json` configured for Android
- ✅ Development build (`expo-dev-client`) or native build

## Enable Debug Mode

### iOS

**Option 1: Automated Script (Recommended)**

After running `npx expo prebuild --platform ios`, run:

```bash
./scripts/enable-firebase-analytics-debug.sh
```

This automatically adds `-FIRDebugEnabled` to your Xcode scheme.

**Option 2: Manual Setup**

1. **Open your project in Xcode:**
   ```bash
   npx expo prebuild --platform ios
   open ios/*.xcworkspace
   ```

2. **Configure Scheme:**
   - Go to **Product** → **Scheme** → **Edit Scheme**
   - Select **Run** in the left sidebar
   - Click the **Arguments** tab
   - Under "Arguments Passed On Launch", click **+** and add:
     ```
     -FIRDebugEnabled
     ```

3. **Run from Xcode:**
   - Build and run the app from Xcode (not Expo Go)
   - Debug mode will be enabled for this session

**Disable Debug Mode:**
- Add `-FIRDebugDisabled` instead, or remove the argument

### Android

1. **Connect your device/emulator:**
   ```bash
   adb devices
   ```

2. **Enable debug mode:**
   ```bash
   adb shell setprop debug.firebase.analytics.app com.jbuxofplenty.coralclash
   ```

3. **Restart your app:**
   - Stop and restart the app (debug mode persists until you disable it)

4. **Disable debug mode:**
   ```bash
   adb shell setprop debug.firebase.analytics.app .none.
   ```

## View Events in DebugView

1. Open [Firebase Console](https://console.firebase.google.com)
2. Select your project: **coral-clash**
3. Navigate to **Analytics** → **DebugView**
4. Select your device from the **DEBUG DEVICE** dropdown
5. Use your app - events will appear in real-time!

## Testing Events

You can test by logging a simple event:

```javascript
import { analytics } from './config/firebase';
import { logEvent } from '@react-native-firebase/analytics';

// Log a test event
logEvent(analytics, 'test_event', {
  test_param: 'test_value',
});
```

## Notes

- Debug mode only works with development builds (not Expo Go)
- Events logged in debug mode are excluded from production Analytics data
- Debug mode persists until explicitly disabled
- Multiple developers can use different devices - each appears separately in DebugView

## Troubleshooting

**No events showing in DebugView:**
- Verify debug mode is enabled (check Xcode arguments or ADB property)
- Ensure you're using a development build (not Expo Go)
- Check that `GoogleService-Info.plist` (iOS) or `google-services.json` (Android) is correctly configured
- Verify Analytics is initialized: Check console logs for "✅ Analytics initialized"

**Events not appearing:**
- Wait a few seconds - there can be a small delay
- Refresh DebugView in Firebase Console
- Check that you're viewing the correct device in DebugView
- Verify the app is actually logging events

