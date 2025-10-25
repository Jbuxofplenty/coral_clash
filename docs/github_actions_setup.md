# GitHub Actions Setup

## Firebase Deployment Workflow

The Firebase deployment workflow automatically deploys your backend services to Firebase.

### Triggers

The workflow runs in three scenarios:

1. **After successful staging deployment** - Automatically deploys when the staging workflow completes successfully on the `develop` branch
2. **Push to main** - Automatically deploys when Firebase-related files are pushed to `main`
3. **Manual trigger** - Can be manually triggered from the GitHub Actions UI with a specific target (functions, firestore, hosting, or all)

### Setup Instructions

#### 1. Generate Firebase CI Token

Run this command locally to generate a Firebase token:

```bash
firebase login:ci
```

This will open a browser for authentication and then output a token.

#### 2. Add GitHub Secret

1. Go to your GitHub repository
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `FIREBASE_TOKEN`
5. Value: Paste the token from step 1
6. Click **Add secret**

### Workflow Features

- ✅ Builds and copies the shared game module
- ✅ Runs functions tests before deployment
- ✅ Supports selective deployment (functions, firestore, hosting, or all)
- ✅ Automatic deployment after successful staging releases
- ✅ Manual deployment option with target selection

### Manual Deployment

To manually trigger a deployment:

1. Go to **Actions** tab in GitHub
2. Select **Deploy to Firebase** workflow
3. Click **Run workflow**
4. Select the target (all, functions, firestore, or hosting)
5. Click **Run workflow** button

### Files Monitored for Auto-Deployment

The workflow automatically triggers on changes to:

- `functions/**` - Cloud Functions
- `shared/**` - Shared game module
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore indexes
- `firebase.json` - Firebase configuration
