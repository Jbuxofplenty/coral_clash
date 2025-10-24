# Deployment Quick Reference

## 🚀 Quick Deploy Commands

### Staging (TestFlight / Internal Testing)

```bash
# Deploy staging via Git tag
git tag v1.8.0-beta.1
git push origin v1.8.0-beta.1

# Or push to develop branch (auto-deploys)
git push origin develop

# Or trigger manually from GitHub
# Go to Actions → "Deploy to Staging" → "Run workflow"
```

### Production (App Store / Play Store)

```bash
# Deploy production via Git tag
git tag v1.8.0
git push origin v1.8.0

# Or trigger manually from GitHub
# Go to Actions → "Deploy to Production" → "Run workflow"
```

## 📦 Local Build & Submit Commands

```bash
# Staging builds
npm run build:staging              # Build both platforms
npm run build:staging:ios          # Build iOS only
npm run build:staging:android      # Build Android only

# Production builds
npm run build:production           # Build both platforms
npm run build:production:ios       # Build iOS only
npm run build:production:android   # Build Android only

# Submit to stores
npm run submit:staging             # Submit to TestFlight + Internal Testing
npm run submit:production          # Submit to App Store + Play Store
```

## 🏗️ Workflow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                  build-and-submit.yml                        │
│              (Reusable Workflow - Shared Code)               │
│                                                              │
│  • Setup Node & Expo                                         │
│  • Install dependencies                                      │
│  • Build for iOS/Android                                     │
│  • Submit to stores                                          │
└─────────────────────────────────────────────────────────────┘
         ▲                                    ▲
         │                                    │
         │                                    │
┌────────┴─────────────┐         ┌───────────┴──────────────┐
│  deploy-staging.yml  │         │    deploy.yml            │
│                      │         │   (Production)           │
│  Triggers:           │         │                          │
│  • v*-beta.*         │         │  Triggers:               │
│  • v*-rc.*           │         │  • v* (not beta/rc)      │
│  • push to develop   │         │  • manual                │
│  • manual            │         │                          │
│                      │         │  Profile: production     │
│  Profile: preview    │         │  Env: production         │
│  Env: staging        │         │                          │
└──────────────────────┘         └──────────────────────────┘
```

## 🏷️ Git Tag Naming Convention

| Tag Format  | Environment | Example         | Destination                   |
| ----------- | ----------- | --------------- | ----------------------------- |
| `v*`        | Production  | `v1.8.0`        | App Store + Play Store        |
| `v*-beta.*` | Staging     | `v1.8.0-beta.1` | TestFlight + Internal Testing |
| `v*-rc.*`   | Staging     | `v1.8.0-rc.1`   | TestFlight + Internal Testing |

## 🔍 Monitoring Deployments

### GitHub Actions

```
Your Repo → Actions tab → Select workflow run
```

### EAS Dashboard

```
https://expo.dev/accounts/[your-account]/projects/coral-clash/builds
```

### EAS CLI

```bash
# List recent builds
eas build:list

# View specific build
eas build:view [build-id]

# Check submission status
eas submission:list
```

## 🎯 Typical Release Flow

### Staging Release (Beta Testing)

```bash
# 1. Commit your changes
git add .
git commit -m "Add new feature"

# 2. Push to develop (auto-deploys to staging)
git push origin develop

# OR create a beta tag
git tag v1.8.0-beta.1
git push origin v1.8.0-beta.1

# 3. Wait ~15-30 mins for builds
# 4. Check TestFlight (iOS) / Internal Testing (Android)
# 5. Test with beta testers
```

### Production Release

```bash
# 1. Merge develop to main
git checkout main
git merge develop

# 2. Update version in app.json
# Edit: "version": "1.8.0"

# 3. Commit version bump
git add app.json
git commit -m "Bump version to 1.8.0"

# 4. Create production tag
git tag v1.8.0
git push origin main --tags

# 5. Wait ~15-30 mins for builds
# 6. Wait 24-48 hours for store review
# 7. Release goes live!
```

## 🛡️ GitHub Environments (Optional Protection)

You can add deployment protection rules in GitHub:

1. Go to Settings → Environments
2. Create `staging` and `production` environments
3. Add protection rules:
    - **Required reviewers**: Require approval before deploy
    - **Wait timer**: Add delay before deployment
    - **Deployment branches**: Limit which branches can deploy

The workflows are already configured to use these environments!

## ⚡ Pro Tips

### 1. Build without submitting

```bash
eas build --profile production --platform all --no-submit
```

### 2. Submit an older build

```bash
eas submission:list  # Find the build ID
eas submit --platform ios --id [build-id]
```

### 3. Cancel a build

```bash
eas build:list  # Find the build ID
eas build:cancel [build-id]
```

### 4. View build logs

```bash
eas build:view [build-id]
```

### 5. Configure build notifications

```bash
# In eas.json, add to build profiles:
"notifications": {
  "email": true,
  "slack": {
    "webhookUrl": "YOUR_SLACK_WEBHOOK"
  }
}
```

## 🐛 Troubleshooting

### Build stuck on "waiting in queue"

- Check EAS plan limits (free plans have queue limits)
- Consider upgrading to paid plan for priority builds

### "No credentials found"

```bash
eas credentials
```

Follow prompts to configure iOS certificates and Android keystores

### Submission fails with "Invalid binary"

- Ensure your app.json version matches
- Check that all required assets are present
- Verify bundle ID matches what's in App Store Connect

### GitHub Action fails with "EXPO_TOKEN not found"

- Go to repo Settings → Secrets → Actions
- Verify `EXPO_TOKEN` exists and is valid
- Generate new token if expired

## 📚 Additional Resources

- [Full Setup Guide](./deployment_setup.md)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Submit Docs](https://docs.expo.dev/submit/introduction/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
