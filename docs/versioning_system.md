# Game Engine Versioning System - Implementation Summary

## ✅ Completed Implementation

### 1. Semantic Release Setup

- ✅ Created `shared/.releaserc.json` for semantic-release configuration
- ✅ Updated `shared/package.json`:
  - Added semantic-release dependencies
  - Configured for GitHub Packages publishing (public access)
  - Version is managed by semantic-release (starts at 1.0.0)
- ✅ Updated `shared/game/index.ts` to read version from package.json dynamically

### 2. CI/CD Workflows

- ✅ Created `.github/workflows/release-shared.yml` for automated package releases
- ✅ Updated `.github/workflows/deploy-staging.yml` to release package before deployment
- ✅ Updated `.github/workflows/deploy.yml` to release package before deployment
- ✅ Updated `.github/workflows/firebase-deploy.yml` with GitHub Packages authentication
- ✅ Updated `.github/workflows/build-and-submit.yml` with GitHub Packages authentication

### 3. Package Configuration

- ✅ Created `functions/.npmrc` for GitHub Packages registry
- ✅ Created root `.npmrc` for GitHub Packages registry
- ✅ Updated `functions/package.json` to use `@jbuxofplenty/coral-clash` package
- ✅ Updated root `package.json` to use `@jbuxofplenty/coral-clash` package
- ✅ Removed local shared build scripts (now using published package)

### 4. Version Validation Logic

- ✅ Created `functions/utils/gameVersion.js` with semantic version validation
- ✅ Updated `functions/routes/game.js`:
  - Import changed from local path to `@jbuxofplenty/coral-clash`
  - Added version validation to `createGame`
  - Added version validation to `createComputerGame`
  - Returns `versionCheck` in responses
- ✅ Updated `functions/routes/matchmaking.js`:
  - Added version validation when joining queue
  - Stores `clientVersion` in queue document
  - Returns `versionCheck` in response

### 5. Client-Side Components

- ✅ Updated `src/hooks/useCoralClash.ts` to export `GAME_VERSION`
- ✅ Created `src/components/VersionWarningBanner.js` for displaying version mismatch warnings

## ⏳ Remaining Manual Steps

### 1. Update Client Game API Calls (REQUIRED)

You need to update your game API calls to send the client version. Find where you make these calls (likely in a context or service file) and update them:

```javascript
import { GAME_VERSION } from '../hooks/useCoralClash';

// Example for creating a PvP game
const createGame = async (opponentId, timeControl) => {
  const result = await functions.httpsCallable('createGame')({
    opponentId,
    timeControl,
    clientVersion: GAME_VERSION, // ADD THIS
  });

  // Check for version mismatch
  if (result.data.versionCheck?.requiresUpdate) {
    setShowVersionWarning(true);
  }

  return result;
};

// Example for creating a computer game
const createComputerGame = async (difficulty, timeControl) => {
  const result = await functions.httpsCallable('createComputerGame')({
    difficulty,
    timeControl,
    clientVersion: GAME_VERSION, // ADD THIS
  });

  if (result.data.versionCheck?.requiresUpdate) {
    setShowVersionWarning(true);
  }

  return result;
};

// Example for joining matchmaking
const joinMatchmaking = async (timeControl) => {
  const result = await functions.httpsCallable('joinMatchmaking')({
    timeControl,
    clientVersion: GAME_VERSION, // ADD THIS
  });

  if (result.data.versionCheck?.requiresUpdate) {
    setShowVersionWarning(true);
  }

  return result;
};
```

### 2. Integrate VersionWarningBanner Component (REQUIRED)

Add the warning banner to your main game screens:

```javascript
import VersionWarningBanner from '../components/VersionWarningBanner';

function YourGameScreen() {
  const [showVersionWarning, setShowVersionWarning] = useState(false);

  return (
    <View>
      <VersionWarningBanner
        visible={showVersionWarning}
        onDismiss={() => setShowVersionWarning(false)}
      />
      {/* Rest of your UI */}
    </View>
  );
}
```

### 3. Update App Store URLs (REQUIRED)

Edit `src/components/VersionWarningBanner.js` and replace placeholder URLs:

```javascript
const storeUrl =
  Platform.OS === 'ios'
    ? 'https://apps.apple.com/app/coral-clash/YOUR_ACTUAL_APP_ID' // UPDATE THIS
    : 'https://play.google.com/store/apps/details?id=com.coralclash';
```

### 4. Install Dependencies (REQUIRED)

Before first deployment, install the new dependencies:

```bash
# In shared directory
cd shared
yarn install

# In functions directory
cd ../functions
yarn install

# In root directory
cd ..
yarn install
```

### 5. Make Initial Release (REQUIRED)

To trigger the first semantic release:

```bash
# Make sure you're on main or develop branch
git checkout main

# Make a conventional commit to trigger release
git commit --allow-empty -m "feat(shared): initial semantic versioning setup"
git push

# This will trigger the release-shared workflow
# which will publish version 1.0.0 to GitHub Packages
```

### 6. Add Commit Linting (OPTIONAL)

If you want to enforce conventional commits, create `.commitlintrc.json`:

```json
{
  "extends": ["@commitlint/config-conventional"],
  "rules": {
    "scope-enum": [2, "always", ["shared", "client", "server", "ci", "docs", "matchmaking", "game"]]
  }
}
```

And add the commitlint workflow (already shown in plan).

## 📋 How It Works

### Release Process

1. Developer makes commits using conventional commit format (e.g., `feat(shared): add new feature`)
2. Push to `main` or `develop` triggers the release-shared workflow
3. Semantic-release analyzes commits and determines version bump
4. Package is published to GitHub Packages
5. Client/server deployments use the published package

### Version Validation

1. Client sends `clientVersion` with game creation/matchmaking requests
2. Server validates version compatibility:
   - Major versions must match (breaking changes)
   - Minor versions must match (feature additions)
   - Patch versions can differ (bug fixes)
3. Server returns `versionCheck` in response:
   ```javascript
   {
     isCompatible: boolean,
     requiresUpdate: boolean,
     serverVersion: string,
     clientVersion: string
   }
   ```
4. Client displays warning banner if `requiresUpdate: true`

### Conventional Commit Examples

- `feat(shared): add whale rotation validation` → Minor bump (1.0.0 → 1.1.0)
- `fix(shared): correct coral placement logic` → Patch bump (1.0.0 → 1.0.1)
- `feat(shared)!: change move format` → Major bump (1.0.0 → 2.0.0)

## 🔧 Local Development

For local development with unpublished changes:

```bash
# Link shared package locally (functions)
cd functions
yarn dev:link

# Link shared package locally (client)
cd ..
yarn dev:link

# When done, unlink and reinstall from registry
yarn dev:unlink
```

## 🚀 Testing the Implementation

1. Make a test commit: `git commit --allow-empty -m "feat(shared): test versioning"`
2. Push and watch the release-shared workflow
3. Verify package published to GitHub Packages
4. Deploy functions and verify they use the new package
5. Build client app and verify it uses the new package
6. Test version mismatch by temporarily changing GAME_VERSION in shared

## 📝 Next Steps

1. Complete the manual steps above
2. Test the full workflow with a real commit
3. Monitor the first few releases to ensure smooth operation
4. Update this document with any learnings or adjustments

## 🐛 Troubleshooting

### Package Not Found

- Ensure GitHub Packages authentication is configured correctly
- Check that package was published successfully
- Verify .npmrc files are present

### Version Mismatch Not Detected

- Verify clientVersion is being sent in API calls
- Check server logs for version validation warnings
- Ensure GAME_VERSION is exported and imported correctly

### Semantic Release Not Triggering

- Check commit message follows conventional format
- Verify workflow has write permissions
- Check that release-shared workflow ran successfully
