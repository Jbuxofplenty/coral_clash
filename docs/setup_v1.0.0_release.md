# Setting Up v1.0.0 Release

Quick guide to set up your first Android production release with proper changelog.

## Step 1: Create v1.0.0 Git Tag

This marks your first release and provides a baseline for future automatic changelogs.

```bash
cd /Users/josiah.buxton/Documents/personal/coral_clash

# Tag current commit as v1.0.0
git tag -a v1.0.0 -m "Release v1.0.0 - Initial Production Release"

# Push tag to GitHub
git push origin v1.0.0
```

**Verify:**
```bash
git tag -l
# Should show: v1.0.0

git log --oneline -1
# Shows the commit that's tagged
```

## Step 2: Set GitHub Variables

### Navigate to Variables

1. Go to your GitHub repository: `https://github.com/jbuxofplenty/coral-clash`
2. Click **Settings** (top navigation)
3. In left sidebar, click **Secrets and variables** → **Actions**
4. Click the **Variables** tab (not Secrets tab)
5. Click **New repository variable** button

### Add Production Changelog

**Name:** `ANDROID_CHANGELOG_PRODUCTION`

**Value:** (Copy and paste this - 201 characters)
```
🎮 Coral Clash v1.0.0

Welcome to Coral Clash! Dive into competitive underwater strategy:

• Real-time multiplayer gameplay
• Strategic coral placement
• Global matchmaking
• Beautiful underwater graphics

Start playing today!
```

Click **Add variable**

### Add Preview Changelog (Optional but Recommended)

Click **New repository variable** again.

**Name:** `ANDROID_CHANGELOG_PREVIEW`

**Value:** (Copy and paste this - 94 characters)
```
v1.0.0 Internal Testing

First production candidate build.
Testing submission pipeline.
```

Click **Add variable**

### Verify Variables

You should now see in the Variables list:
- ✅ `ANDROID_CHANGELOG_PREVIEW` - "v1.0.0 Internal Testing..."
- ✅ `ANDROID_CHANGELOG_PRODUCTION` - "🎮 Coral Clash v1.0.0..."

## Step 3: Deploy

### Preview Deployment (Recommended First)

1. Go to **Actions** tab in GitHub
2. Click **Deploy to Staging** workflow
3. Click **Run workflow** dropdown
4. Select options:
   - **Use workflow from:** `main`
   - **Platform:** `android` (or `all` if iOS is ready)
5. Click **Run workflow**

**What happens:**
- Builds Android app
- Uses `ANDROID_CHANGELOG_PREVIEW` for release notes
- Uploads to Play Console Internal Testing track
- Creates draft release with changelog

**Verify in Play Console:**
1. Go to Google Play Console
2. Navigate to **Release → Internal testing**
3. Find the new release
4. Check **Release notes** section - should show your changelog

### Production Deployment

Once preview testing is successful:

1. Go to **Actions** tab in GitHub
2. Click **Deploy to Production** workflow
3. Click **Run workflow** dropdown
4. Select options:
   - **Use workflow from:** `main`
   - **Platform:** `android`
5. Click **Run workflow**
6. **Approve** the deployment (if environment protection is enabled)

**What happens:**
- Builds Android app
- Uses `ANDROID_CHANGELOG_PRODUCTION` for release notes
- Uploads to Play Console Production track
- Creates **draft** release with changelog
- Ready for you to submit for review

**Verify in Play Console:**
1. Go to Google Play Console
2. Navigate to **Release → Production**
3. Find the draft release
4. Check **Release notes** section - should show:
   ```
   🎮 Coral Clash v1.0.0
   
   Welcome to Coral Clash! Dive into competitive underwater strategy:
   
   • Real-time multiplayer gameplay
   • Strategic coral placement
   • Global matchmaking
   • Beautiful underwater graphics
   
   Start playing today!
   ```
5. Click **Review release** → **Start rollout to Production**

## Step 4: Cleanup (Optional)

After your first release is live, you can **delete** the GitHub Variables to enable automatic changelog generation for future releases.

**Why delete?**
- Future releases will auto-generate changelogs from commits
- Manual variables take priority over auto-generation
- You want automatic behavior going forward

**How to delete:**
1. GitHub → Settings → Secrets and variables → Actions → Variables
2. Click **Delete** next to `ANDROID_CHANGELOG_PRODUCTION`
3. Click **Delete** next to `ANDROID_CHANGELOG_PREVIEW`

**What happens next:**
- v1.1.0 release will auto-generate changelog from commits between v1.0.0..v1.1.0
- You can always set variables again to override auto-generation

## For Future Releases (v1.1.0+)

After v1.0.0 is deployed, future releases are fully automatic:

1. **Make commits using conventional format:**
   ```bash
   git commit -m "feat(client): add tournament mode"
   git commit -m "fix(shared): fix coral collision bug"
   ```

2. **Tag the release:**
   ```bash
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin v1.1.0
   ```

3. **Deploy:**
   - Run deployment workflow
   - Changelog automatically generated from commits
   - No manual variable needed!

**Auto-generated example:**
```
🎮 New Features:
• Add tournament mode

🐛 Bug Fixes:
• Fix coral collision bug
```

## Testing Changelog Generation

Want to preview what future changelogs will look like?

```bash
# Test the generator locally
bash .github/scripts/test-changelog.sh

# Or test specific track
bash .github/scripts/generate-changelog.sh android production
```

This shows you what would be generated based on commits since v1.0.0.

## Troubleshooting

### Git tag already exists

```bash
# Delete local tag
git tag -d v1.0.0

# Delete remote tag
git push origin :refs/tags/v1.0.0

# Recreate
git tag -a v1.0.0 -m "Release v1.0.0 - Initial Production Release"
git push origin v1.0.0
```

### Can't find Variables tab in GitHub

- Make sure you're in **Settings** (not your profile settings)
- Must have **Admin** or **Write** access to repository
- Look for **Secrets and variables** → **Actions** in left sidebar
- Click **Variables** tab (next to Secrets and Environments tabs)

### Changelog not showing in Play Console

**Check workflow logs:**
1. GitHub → Actions → Click the workflow run
2. Find "Build and Submit Android" job
3. Check "Generate Changelog from Commits" step
4. Should show: "✅ Changelog generated"

**Check Fastlane logs:**
1. Scroll to "Build and Submit to Production" step
2. Should show: "✅ Uploaded to Production (draft) with changelog: ..."

### Need to update changelog after deployment

If you already deployed but want to change the changelog:

1. **Update GitHub Variable** with new text
2. **Re-run workflow**
3. New build with updated changelog will be created

Or manually edit in Play Console:
1. Go to draft release
2. Edit release notes
3. Save changes

## Summary Checklist

For v1.0.0 release:

- [ ] Create and push `v1.0.0` git tag
- [ ] Set `ANDROID_CHANGELOG_PRODUCTION` GitHub Variable
- [ ] Set `ANDROID_CHANGELOG_PREVIEW` GitHub Variable (optional)
- [ ] Test with preview deployment
- [ ] Deploy to production
- [ ] Verify changelog in Play Console
- [ ] Submit for review in Play Console
- [ ] (Optional) Delete variables after release to enable auto-generation

For v1.1.0+ releases:

- [ ] Make commits using conventional format (feat, fix, etc.)
- [ ] Tag release (`v1.1.0`)
- [ ] Deploy (changelog auto-generated!)
- [ ] No manual variables needed ✨

---

**Related Documentation:**
- `docs/changelog_automation.md` - Complete automation guide
- `docs/android_release_notes.md` - Release notes configuration
- `.cursorrules` - Conventional commit format requirements

