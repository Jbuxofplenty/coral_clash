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

### Deploying to Staging

```bash
# Create and push a staging tag
git tag v1.8.0-beta.1
git push origin v1.8.0-beta.1
```

**What happens:**
1. ✅ Staging workflow starts automatically
2. ✅ Builds app and submits to TestFlight
3. ⏸️  **Pauses and waits for approval**

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

## Workflow Diagram

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

## Benefits

✅ **Safety**: Can't accidentally deploy to production without testing  
✅ **Convenience**: No manual tag creation, everything automatic  
✅ **Audit Trail**: Clear record of who approved each production release  
✅ **Flexibility**: Can still manually promote if needed  
✅ **Simplicity**: Just push a tag and click approve when ready  

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

## Environment Configuration

The staging workflow only triggers the approval gate when:
- ✅ Triggered by a tag push (not branch push)
- ✅ Tag contains `-beta.` or `-rc.`

Branch pushes to `develop` will deploy to staging but won't trigger the approval gate.

