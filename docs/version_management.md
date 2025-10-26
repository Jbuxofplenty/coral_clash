# Version Management

This document explains how version bumping and tagging work in the Coral Clash deployment workflow.

## Overview

Version management happens **after** production approval, not before staging deployment. This ensures that staging versions are tested before production, and version bumping happens atomically as part of the production release process.

## Version Format

- **Production tags**: `v1.2.0` (vMAJOR.MINOR.PATCH)
- **Staging tags**: `v1.2.0-beta.1` or `v1.2.0-rc.1`
- **app.json version**: `1.2.0` (no 'v' prefix)

## Deployment Flow

### 1. Deploy to Staging

**Trigger**: Push to `develop` branch

**What happens**:
1. Tests run
2. Workflow finds the **latest existing** beta/rc tag
3. If no staging tags exist, creates `v1.0.0-beta.1`
4. If staging tag exists (e.g., `v1.2.0-beta.1`), uses that tag
5. Deploys to TestFlight using that tag
6. Waits for approval to promote to production

**Key Points**:
- ✅ Uses existing staging tags - no version bump
- ✅ No file updates during staging deployment
- ✅ Can redeploy same staging version multiple times

### 2. Promote to Production

**Trigger**: Manual approval in GitHub Actions after staging deployment succeeds

**What happens**:
1. Creates production tag by stripping `-beta.X` suffix
   - Example: `v1.2.0-beta.1` → `v1.2.0`
2. Updates `app.json` on develop branch with production version
   - Updates `"version": "1.2.0"`
   - Commits with message: `chore(release): bump version to 1.2.0 [skip ci]`
3. Calculates next staging version (bumps minor)
   - Example: `v1.2.0` → `v1.3.0-beta.1`
4. Creates next staging tag pointing to latest develop
5. Triggers production deployment

**Key Points**:
- ✅ Version bump happens AFTER production approval
- ✅ app.json is updated on develop branch
- ✅ Next staging tag is created automatically
- ✅ Ready for next staging deployment cycle

## Example Workflow

### Initial Release (No Tags Exist)

```bash
# Push to develop
git push origin develop

# Staging workflow:
# - No tags found, creates v1.0.0-beta.1
# - Deploys to TestFlight

# After approval:
# - Creates production tag: v1.0.0
# - Updates app.json: "version": "1.0.0"
# - Creates next staging tag: v1.1.0-beta.1
# - Deploys to production
```

### Subsequent Release

```bash
# Push new features to develop
git push origin develop

# Staging workflow:
# - Finds latest staging tag: v1.1.0-beta.1
# - Uses existing tag for deployment
# - Deploys to TestFlight

# After approval:
# - Creates production tag: v1.1.0
# - Updates app.json: "version": "1.1.0"
# - Creates next staging tag: v1.2.0-beta.1
# - Deploys to production
```

### Redeploying Staging (Same Version)

```bash
# Push fixes to develop
git push origin develop

# Staging workflow:
# - Finds latest staging tag: v1.2.0-beta.1
# - Tag already exists, skips creation
# - Deploys using existing tag
# - Deploys to TestFlight

# No version bump until production approval
```

## Version Bumping Strategy

Currently, the workflow uses **minor version bumps** for each release:
- `v1.0.0` → `v1.1.0` → `v1.2.0` → `v1.3.0`

The patch version is always reset to `0`.

To use a different bumping strategy (patch or major), modify the "Create next staging version" step in `.github/workflows/promote-to-production.yml`.

## Manual Version Management

If you need to manually create a staging tag (e.g., for a specific version):

```bash
# Create a new staging tag
git tag -a v2.0.0-beta.1 -m "Start v2.0.0 staging cycle"
git push origin v2.0.0-beta.1

# The staging workflow will use this tag on next deploy
```

## Troubleshooting

### Staging tag already exists error

This should no longer happen - the workflow now checks if tags exist before creating them. If a tag exists, it will be reused.

### Wrong version in app.json

The production promotion workflow updates app.json automatically. If it's out of sync:

1. Check the latest production tag: `git tag -l 'v*' | grep -v -E '(beta|rc)' | sort -V | tail -n1`
2. Manually update app.json to match
3. Commit: `git commit -m "chore: sync app.json version"`

### Need to skip a version

If you need a specific version number:

1. Create the staging tag manually
2. Let the workflow use that tag
3. Production promotion will create the next version based on it

## Files Affected

- `.github/workflows/deploy-staging.yml` - Staging deployment, uses existing tags
- `.github/workflows/promote-to-production.yml` - Production promotion, version bumping
- `app.json` - Updated automatically by production promotion workflow
- Git tags - Created automatically by workflows

## Related Documentation

- [Deployment Quick Reference](./deployment_quick_reference.md)
- [Deployment Setup](./deployment_setup.md)
- [GitHub Actions Setup](./github_actions_setup.md)

