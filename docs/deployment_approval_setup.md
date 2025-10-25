# Deployment Approval Setup

This guide explains how to set up the approval gate for promoting staging builds to production.

## Overview

The new CI pipeline works like this:

1. **Push staging tag** → Deploys to TestFlight automatically
2. **Workflow pauses** → Waits for your approval
3. **Test in TestFlight** → Download and test the staging build
4. **Approve** → Click "Approve" in GitHub Actions
5. **Auto-promote** → Creates production tag and deploys to App Store

## Setup GitHub Environment (One-time)

You need to create a GitHub Environment with required reviewers to enable the approval gate.

### Steps:

1. **Go to Repository Settings**
   - Navigate to your repo on GitHub
   - Click **Settings** → **Environments**

2. **Create Production Approval Environment**
   - Click **New environment**
   - Name it: `production-approval`
   - Click **Configure environment**

3. **Add Required Reviewers**
   - Check ✅ **Required reviewers**
   - Add yourself (and any other team members who should approve)
   - Set **Wait timer** to `0` minutes (or leave blank)
   
4. **Save Protection Rules**
   - Click **Save protection rules**

## How to Use

### Option 1: Deploying to Staging with Manual Version (Tag)

```bash
# Create and push a staging tag
git tag v1.8.0-beta.1
git push origin v1.8.0-beta.1
```

**What happens:**
1. ✅ Staging workflow starts automatically
2. ✅ Builds app and submits to TestFlight
3. ⏸️  **Pauses and waits for approval**
4. ✅ When approved, promotes `v1.8.0-beta.1` → `v1.8.0`

### Option 2: Deploying to Staging with Auto-Versioning (Branch)

```bash
# Push to develop branch
git push origin develop
```

**What happens:**
1. ✅ Finds last production tag (e.g., `v1.9.0`)
2. ✅ Auto-bumps minor version → `v1.10.0`
3. ✅ Creates staging tag → `v1.10.0-beta.1`
4. ✅ Builds app and submits to TestFlight
5. ⏸️  **Pauses and waits for approval**
6. ✅ When approved, promotes `v1.10.0-beta.1` → `v1.10.0`

**Version Bumping Logic:**
- Last tag: `v1.9.0` → New: `v1.10.0-beta.1` → Production: `v1.10.0`
- Last tag: `v2.5.0` → New: `v2.6.0-beta.1` → Production: `v2.6.0`
- No tags yet → New: `v1.0.0-beta.1` → Production: `v1.0.0`

### Approving for Production

1. **Go to GitHub Actions**
   - Navigate to: https://github.com/Jbuxofplenty/coral_clash/actions
   - Click on the running workflow

2. **Test in TestFlight**
   - Download the build from TestFlight
   - Test thoroughly on your device
   - Make sure everything works

3. **Approve the Promotion**
   - In the workflow, you'll see: **"Approve for Production"** (yellow/waiting)
   - Click **Review deployments**
   - Select ✅ `production-approval`
   - Click **Approve and deploy**

4. **Automatic Production Deployment**
   - Creates production tag (e.g., `v1.8.0-beta.1` → `v1.8.0`)
   - Triggers production deployment workflow
   - Submits to App Store

### Manual Promotion (Fallback)

If you prefer to manually promote without the approval gate:

1. Go to **Actions** → **"Promote to Production"**
2. Click **Run workflow**
3. Enter the staging tag (e.g., `v1.8.0-beta.1`)
4. Select platform
5. Click **Run workflow**

## Workflow Diagrams

### Flow A: Manual Tag (Explicit Version)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Push Staging Tag                                          │
│    git push origin v1.8.0-beta.1                            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Deploy to Staging (Automatic)                            │
│    • Builds app                                             │
│    • Submits to TestFlight                                  │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Approval Gate ⏸️  (Requires Human Approval)              │
│    • Workflow pauses                                        │
│    • Waits for reviewer approval                            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Test in TestFlight 🧪                                     │
│    • Download from TestFlight                               │
│    • Test on device                                         │
│    • Verify everything works                                │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Approve in GitHub UI ✅                                   │
│    • Click "Review deployments"                             │
│    • Approve "production-approval"                          │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Promote to Production (Automatic)                        │
│    • Creates v1.8.0 tag from v1.8.0-beta.1                 │
│    • Triggers production workflow                           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Deploy to Production (Automatic)                         │
│    • Builds app                                             │
│    • Submits to App Store                                   │
└─────────────────────────────────────────────────────────────┘
```

### Flow B: Branch Push (Auto-Version)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Push to develop                                           │
│    git push origin develop                                   │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Deploy to Staging (Automatic)                            │
│    • Builds app                                             │
│    • Submits to TestFlight                                  │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 3. Auto-Version & Tag (Automatic)                           │
│    • Finds last tag: v1.9.0                                 │
│    • Bumps minor: v1.10.0                                   │
│    • Creates: v1.10.0-beta.1                                │
│    • Pushes staging tag                                     │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 4. Approval Gate ⏸️  (Requires Human Approval)              │
│    • Workflow pauses                                        │
│    • Waits for reviewer approval                            │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 5. Test in TestFlight 🧪                                     │
│    • Download from TestFlight                               │
│    • Test on device                                         │
│    • Verify everything works                                │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 6. Approve in GitHub UI ✅                                   │
│    • Click "Review deployments"                             │
│    • Approve "production-approval"                          │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 7. Promote to Production (Automatic)                        │
│    • Creates v1.10.0 tag from v1.10.0-beta.1               │
│    • Triggers production workflow                           │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ 8. Deploy to Production (Automatic)                         │
│    • Builds app                                             │
│    • Submits to App Store                                   │
└─────────────────────────────────────────────────────────────┘
```

## Benefits

✅ **Safety**: Can't accidentally deploy to production without testing  
✅ **Auto-Versioning**: Push to `develop` and versioning is handled automatically  
✅ **Flexibility**: Choose manual tags OR auto-versioning based on your workflow  
✅ **Convenience**: No manual tag creation, everything automatic  
✅ **Audit Trail**: Clear record of who approved each production release  
✅ **Simplicity**: Just push code and click approve when ready  

## Troubleshooting

### "production-approval environment not found"

You need to create the environment in GitHub Settings (see Setup section above).

### Approval doesn't show up

1. Make sure you pushed a staging tag (with `-beta.` or `-rc.`)
2. Check that the staging deployment succeeded
3. Refresh the GitHub Actions page

### Want to skip approval for testing

Use manual trigger:
- Actions → "Promote to Production" → Run workflow
- Enter staging tag manually

### Version conflict after branch push

If auto-versioning creates a tag that already exists:
1. The workflow will detect it and skip tag creation
2. You can manually delete the conflicting tag and re-run
3. Or use manual tag push with a different version

### Want specific version number

Use manual tag instead of branch push:
```bash
# Instead of: git push origin develop
# Use:
git tag v2.5.0-beta.1
git push origin v2.5.0-beta.1
```

## Environment Configuration

The approval gate now triggers for:
- ✅ Tag pushes (manual versioning)
- ✅ Branch pushes to `develop` (auto-versioning)
- ✅ Manual workflow triggers

