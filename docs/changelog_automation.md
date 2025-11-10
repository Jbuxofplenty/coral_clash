# Automatic Changelog Generation

## Overview

Your CI/CD pipeline **automatically generates release notes** from conventional commits! The changelog generator analyzes commits since the last release and creates user-facing release notes for the Play Store.

## How It Works

### Priority System

The workflow uses this priority order for release notes:

```
1. Manual Override (GitHub Variables)
   ↓ if not set
2. Auto-generated (from commits)
   ↓ if no commits found
3. Hardcoded Fallback
```

**For Preview/Internal Testing:**

```yaml
CHANGELOG: ${{ vars.ANDROID_CHANGELOG_PREVIEW || steps.changelog.outputs.changelog || 'Bug fixes and performance improvements for internal testing' }}
```

**For Production:**

```yaml
CHANGELOG: ${{ vars.ANDROID_CHANGELOG_PRODUCTION || steps.changelog.outputs.changelog || 'Bug fixes and performance improvements' }}
```

### Automatic Generation

The workflow automatically:

1. Fetches all git tags and history
2. Finds the last release tag (e.g., `v1.0.0`)
3. Analyzes commits from last release to HEAD
4. Extracts conventional commits with `client` or `shared` scope
5. Categorizes by type: `feat`, `fix`, `perf`, `refactor`
6. Formats into user-friendly release notes
7. Ensures it's under 500 characters (Play Store limit)

### Commit Analysis

**Included scopes** (user-facing changes):

- `feat(client):` - New features in the mobile app
- `fix(client):` - Bug fixes in the mobile app
- `feat(shared):` - New features in game engine
- `fix(shared):` - Bug fixes in game engine
- `perf(client):` or `perf(shared):` - Performance improvements

**Excluded scopes** (internal changes):

- `feat(server):` - Backend changes (not user-visible)
- `docs:` - Documentation updates
- `ci:` - CI/CD changes
- `test:` - Test updates
- `chore:` - Maintenance tasks

### Example: Commit to Changelog

**Commits since v1.0.0:**

```bash
feat(client): add tournament mode
feat(shared): add 5 new coral species
fix(client): prevent crash during whale rotation
fix(shared): correct coral placement validation
perf(client): improve rendering performance
docs: update README (excluded - not user-facing)
ci: update workflow (excluded - not user-facing)
```

**Generated Changelog:**

```
🎮 New Features:
• Add tournament mode
• Add 5 new coral species

🐛 Bug Fixes:
• Prevent crash during whale rotation
• Correct coral placement validation

⚡ Improvements:
• Improve rendering performance
```

## Setting Up Your First Release (v1.0.0)

Since you don't have a release tag yet, the auto-generator will use **all commits from main branch**. For your first release, it's better to set a custom message.

### Step 1: Create v1.0.0 Tag (Recommended)

```bash
# Tag your current stable commit
git tag -a v1.0.0 -m "Release v1.0.0 - Initial Release"
git push origin v1.0.0
```

This tells the changelog generator where to start analyzing commits for future releases.

### Step 2: Set GitHub Variables for v1.0.0

Go to: **GitHub Repository → Settings → Secrets and variables → Actions → Variables tab**

#### Add Production Changelog

**Name:** `ANDROID_CHANGELOG_PRODUCTION`

**Value:**

```
🎮 Coral Clash v1.0.0

Welcome to Coral Clash! Dive into competitive underwater strategy:

• Real-time multiplayer gameplay
• Strategic coral placement
• Global matchmaking
• Beautiful underwater graphics

Start playing today!
```

**Character count:** 201/500 ✅

#### Add Preview Changelog (Optional)

**Name:** `ANDROID_CHANGELOG_PREVIEW`

**Value:**

```
v1.0.0 - Internal testing build

Testing release pipeline and app store submission process.
```

### Step 3: Deploy

Run your deployment workflow:

- Preview builds use `ANDROID_CHANGELOG_PREVIEW`
- Production builds use `ANDROID_CHANGELOG_PRODUCTION`

## For Future Releases (Automatic)

After v1.0.0, **you don't need to set GitHub Variables** - changelogs auto-generate!

### Workflow for v1.1.0

1. **Make commits using conventional format:**

   ```bash
   git commit -m "feat(client): add daily challenges"
   git commit -m "feat(client): add player profiles"
   git commit -m "fix(shared): fix coral collision detection"
   ```

2. **Tag the release:**

   ```bash
   git tag -a v1.1.0 -m "Release v1.1.0"
   git push origin v1.1.0
   ```

3. **Deploy:**

   ```bash
   # Trigger deployment workflow
   # Changelog automatically generated from commits between v1.0.0..v1.1.0
   ```

4. **Generated changelog will be:**

   ```
   🎮 New Features:
   • Add daily challenges
   • Add player profiles

   🐛 Bug Fixes:
   • Fix coral collision detection
   ```

## Manual Override (Optional)

You can always override auto-generation by setting GitHub Variables:

**When to override:**

- Marketing-focused release messaging
- Simplified language for users
- Multi-release notes (not just since last version)
- Breaking changes need special explanation

**How to override:**

1. Set `ANDROID_CHANGELOG_PRODUCTION` variable
2. Run deployment
3. Your custom message takes priority over auto-generated

**To return to auto-generation:**

1. Delete the GitHub Variable
2. Run deployment
3. Auto-generated changelog will be used

## Testing Locally

Test changelog generation before releasing:

```bash
# Test Android production changelog
bash .github/scripts/test-changelog.sh

# Or test directly
bash .github/scripts/generate-changelog.sh android production
```

**Output shows:**

- Commit range analyzed
- Commits found per category
- Generated changelog
- Character count

## Best Practices

### 1. Use Conventional Commits

✅ **Good:**

```bash
feat(client): add tournament leaderboard
fix(shared): prevent invalid whale moves
perf(client): optimize coral rendering
```

❌ **Bad:**

```bash
added stuff
Fixed bugs
WIP
update code
```

### 2. Write Clear Commit Messages

The commit message becomes release notes - write for users, not developers.

✅ **Good:**

```bash
feat(client): add offline mode for single player
# Becomes: "Add offline mode for single player"
```

❌ **Bad:**

```bash
feat(client): implement OfflineGameManager with AsyncStorage persistence
# Too technical for users
```

### 3. Scope Commits Correctly

- `client` - Mobile app UI/UX changes
- `shared` - Game logic/engine changes (affects all platforms)
- `server` - Backend only (excluded from mobile release notes)
- `ci` - Pipeline changes (excluded)
- `docs` - Documentation (excluded)

### 4. Tag Releases Consistently

```bash
# Semantic versioning
v1.0.0  # Major release
v1.1.0  # Minor release (new features)
v1.1.1  # Patch release (bug fixes)

# Always annotated tags
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

### 5. Review Before Deploying

```bash
# Preview what changelog will be generated
bash .github/scripts/generate-changelog.sh android production

# If you don't like it, set GitHub Variable to override
```

## Troubleshooting

### "No conventional commits found"

**Cause:** Commits don't follow conventional format or use excluded scopes.

**Solution:**

```bash
# Check recent commits
git log --oneline -10

# Look for:
feat(client): or fix(shared): etc.

# If missing, either:
1. Rewrite commits (if not pushed): git commit --amend
2. Set manual changelog via GitHub Variable
```

### Changelog too long (> 500 characters)

**Cause:** Too many changes in one release.

**Solution:**

- Auto-truncates with "..."
- OR set manual GitHub Variable with condensed message

### Wrong commits included

**Cause:** Tag might be in wrong place.

**Solution:**

```bash
# Check what commits are between tags
git log v1.0.0..HEAD --oneline

# If needed, delete and recreate tag
git tag -d v1.1.0
git push origin :refs/tags/v1.1.0
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0
```

### Auto-generation not working

**Check workflow logs:**

1. GitHub Actions → Latest workflow run
2. Look for "Generate Changelog from Commits" step
3. Check output for errors

**Common issues:**

- No tags found (first release)
- Git history not fetched (workflow handles this)
- All commits use excluded scopes (ci, docs, server)

## Summary

✅ **Automatic** - Changelogs generated from commits
✅ **Conventional Commits** - Follow `type(scope): subject` format  
✅ **User-Focused** - Only client/shared changes included
✅ **Override Available** - Manual control via GitHub Variables
✅ **Character Limit** - Auto-truncates to 500 characters
✅ **Testing** - Preview locally before deployment

**For v1.0.0:**

- Set `ANDROID_CHANGELOG_PRODUCTION` variable manually
- Create `v1.0.0` tag

**For v1.1.0+:**

- Make conventional commits
- Create tag
- Deploy (automatic!)

---

**Related Documentation:**

- `docs/android_release_notes.md` - Release notes configuration
- `.cursorrules` - Commit message format requirements
- `.github/scripts/generate-changelog.sh` - Generator source code
