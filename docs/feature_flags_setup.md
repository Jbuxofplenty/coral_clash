# Feature Flags Setup

## Overview

Feature flags allow dynamic control of app features without requiring a new app deployment. The system provides a generic, type-safe way to manage feature flags with Firestore storage, caching, and fallback support.

## Architecture

The feature flags system is built on three key principles:

1. **Type Safety**: Feature flag names are typed to prevent typos and ensure consistency
2. **Caching**: Flags are cached in-memory to reduce Firestore reads (configurable TTL)
3. **Fallback**: Automatic fallback to environment variables or default values if Firestore fails

### Implementation

- **Core Utility**: `src/utils/featureFlags.js` - Generic feature flag system
- **Consumer**: `src/utils/tracking.js` - Uses feature flags for ads configuration
- **Security**: `firestore.rules` - Controls read/write access to feature flags

## Ads Mode Feature Flag

### Firestore Structure

Create a document in the `featureFlags` collection with the ID `ads`:

```
featureFlags (collection)
  └── ads (document)
      └── mode: "disabled" | "test" | "enabled"
```

### Setting Up in Firebase Console

1. Go to Firebase Console → Firestore Database
2. Create a collection named `featureFlags` (if it doesn't exist)
3. Create a document with ID `ads`
4. Add a field:
   - **Field name**: `mode`
   - **Type**: `string`
   - **Value**: One of: `"disabled"`, `"test"`, or `"enabled"`

### Ads Mode Values

- **`disabled`**: No ads shown to anyone
- **`test`**: Test ads shown to everyone (including internal users)
- **`enabled`**: Real ads shown to non-internal users, test ads for internal users

### Fallback Behavior

If the Firestore document doesn't exist or can't be fetched, the system falls back to the `EXPO_PUBLIC_ADS_MODE` environment variable.

### Caching

The ads mode is cached for the entire app session (Infinity TTL) after being fetched once on startup. This means:

- **Zero additional Firestore reads** during the app session
- **Instant access** after initialization
- **Cache persists** until the app is restarted or cache is manually cleared

### Initialization

The ads mode flag is initialized once on app startup in `App.js`:

```javascript
import { initializeAdsMode } from './src/utils/featureFlags';

// In App.js prepare() function
const adsMode = await initializeAdsMode();
// Fetches from Firestore and caches for entire app session
```

This happens before the app renders, ensuring the flag is always available.

### Using in Code

#### Option 1: Use Ads-Specific Functions (Recommended for Ads)

The feature flag is automatically used by the ads system (reads from cache after initialization):

```javascript
import { shouldEnableAds, shouldUseTestAds } from '../utils/tracking';
import { getAdsMode } from '../utils/featureFlags';

// Check if ads are enabled (async, reads from cache)
const adsEnabled = await shouldEnableAds(user);

// Check if test ads should be used (async, reads from cache)
const useTestAds = await shouldUseTestAds(user);

// Get the current ads mode directly (async, reads from cache)
const mode = await getAdsMode(); // returns 'enabled', 'test', or 'disabled'
```

#### Option 2: Use Generic Feature Flag API

For direct access to the feature flag system:

```javascript
import { getFeatureFlag, clearFeatureFlagCache } from '../utils/featureFlags';

// Get a feature flag with custom configuration
const adsMode = await getFeatureFlag('ads', {
    documentId: 'ads',
    field: 'mode',
    validValues: ['enabled', 'test', 'disabled'],
    fallback: 'disabled',
    cacheTTL: 5 * 60 * 1000, // 5 minutes (optional)
});

// Clear cache for a specific flag
clearFeatureFlagCache('ads');

// Clear all flag caches
clearFeatureFlagCache();
```

### React Hook

The `useAds` hook automatically fetches the feature flag:

```javascript
import { useAds } from '../hooks/useAds';

function MyComponent() {
  const { isEnabled, loading } = useAds();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return isEnabled ? <AdComponent /> : null;
}
```

## Firestore Security Rules

Ensure your Firestore security rules allow reading the `featureFlags` collection:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Feature flags are readable by all authenticated users
    match /featureFlags/{flagId} {
      allow read: if request.auth != null;
      allow write: if false; // Only admins can write via Firebase Console
    }
  }
}
```

## Testing

### Test with Firestore (Production-like)

1. Set the feature flag in Firestore to `test` or `enabled`
2. Launch the app
3. Check console logs for "📊 Ads mode from Firestore: [mode]"

### Test with Environment Variable (Fallback)

1. Delete or set invalid value in Firestore document
2. Set `EXPO_PUBLIC_ADS_MODE` in your `.env` file
3. Launch the app
4. Check console logs for "📊 Ads mode from environment: [mode]"

### Test Cache Behavior

1. Set ads mode in Firestore
2. Launch app and verify mode is fetched (check logs for "🚀 Initializing ads mode feature flag...")
3. The mode is now cached for the entire app session
4. To see changes from Firestore, restart the app (cache persists until restart)

## Adding New Feature Flags

The system is designed to be extensible. Follow these steps to add new feature flags:

### Step 1: Add Type Definition

Update the `FeatureFlagName` typedef in `src/utils/featureFlags.js`:

```javascript
/**
 * @typedef {'ads' | 'newFeature'} FeatureFlagName
 * Available feature flags:
 * - 'ads': Controls ads mode ('enabled' | 'test' | 'disabled')
 * - 'newFeature': Description of your new feature flag
 */
```

### Step 2: Create Firestore Document

Create a new document in the `featureFlags` collection:

```
featureFlags (collection)
  └── newFeature (document)
      └── enabled: true
      └── config: { ... }
```

### Step 3: Create Getter Function (Optional)

For convenience, create a specific getter function in `featureFlags.js`:

```javascript
/**
 * Get the new feature flag
 * @returns {Promise<boolean>} Whether the feature is enabled
 */
export const getNewFeature = async () => {
    return getFeatureFlag('newFeature', {
        documentId: 'newFeature',
        field: 'enabled',
        validValues: [true, false],
        fallback: false,
        cacheTTL: 10 * 60 * 1000, // 10 minutes
    });
};
```

### Step 4: Use the Feature Flag

```javascript
import { getNewFeature } from '../utils/featureFlags';

// In your component or function
const isEnabled = await getNewFeature();
if (isEnabled) {
    // Feature-specific logic
}
```

### Step 5: Update Security Rules (if needed)

The existing rules should work for all flags in the `featureFlags` collection, but review if you need custom access control.

