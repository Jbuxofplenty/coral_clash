# Android Release Notes Configuration

## Overview

The CI/CD pipeline now automatically includes release notes when submitting builds to the Play Store. This eliminates the need to manually add release notes in the Play Console after each upload.

## How It Works

### Priority Order

Fastlane uses the following priority to determine which release notes to use:

1. **GitHub Repository Variables** (highest priority)
   - `ANDROID_CHANGELOG_PREVIEW` - For internal testing builds
   - `ANDROID_CHANGELOG_PRODUCTION` - For production builds

2. **Version-Specific Files**
   - `fastlane/metadata/android/en-US/changelogs/[VERSION_CODE].txt`
   - Example: `50.txt` for version code 50

3. **Default Changelog File**
   - `fastlane/metadata/android/en-US/changelogs/default.txt`

4. **Hardcoded Fallback** (in Fastfile)
   - "Bug fixes and performance improvements"

## Configuration Methods

### Method 1: GitHub Variables (Recommended for Quick Changes)

Best for when you want to control release notes per deployment without committing files.

**Setup:**

1. Go to GitHub Repository Settings
2. Navigate to: Settings → Secrets and variables → Actions → Variables tab
3. Add/Edit variables:
   - `ANDROID_CHANGELOG_PREVIEW` - Notes for preview/staging builds
   - `ANDROID_CHANGELOG_PRODUCTION` - Notes for production builds

**Pros:**

- ✅ Easy to update without code changes
- ✅ Different notes for preview vs production
- ✅ Immediate effect on next deployment
- ✅ No commit needed

**Cons:**

- ❌ Not version controlled
- ❌ Must update manually for each release
- ❌ Only supports one language (en-US)

**Example Value:**

```
🎮 New in v1.2.0

• Tournament Mode - Compete weekly!
• 5 New Coral Species
• Improved Matchmaking
• Bug fixes and stability improvements

Total: 142/500 characters
```

### Method 2: Version-Specific Files (Recommended for Multi-Language)

Best for apps with multiple languages or when you want version-controlled release notes.

**Setup:**

```bash
# Create a changelog for version code 51
echo "Version 1.1.0

New Features:
- Tournament mode
- New coral species
- Improved matchmaking" > fastlane/metadata/android/en-US/changelogs/51.txt

# Add Spanish translation
mkdir -p fastlane/metadata/android/es-ES/changelogs
echo "Versión 1.1.0

Nuevas funciones:
- Modo torneo
- Nuevas especies de coral
- Emparejamiento mejorado" > fastlane/metadata/android/es-ES/changelogs/51.txt
```

**Pros:**

- ✅ Version controlled (in git)
- ✅ Multi-language support
- ✅ Automatic - no manual updates needed
- ✅ History of all release notes

**Cons:**

- ❌ Must commit and push changes
- ❌ Need to know version code in advance
- ❌ More files to manage

### Method 3: Default File (Recommended for Generic Messages)

Best for apps that don't need detailed release notes or during early development.

**Setup:**

```bash
# Edit the default changelog
echo "Bug fixes and performance improvements" > fastlane/metadata/android/en-US/changelogs/default.txt
```

**Pros:**

- ✅ Simple - one file for all releases
- ✅ Version controlled
- ✅ Works for all versions

**Cons:**

- ❌ Same message for every release
- ❌ Not specific to version changes

## Multi-Language Support

### Supported Languages

Create directories for each language you want to support:

```
fastlane/metadata/android/
├── en-US/    # English (United States)
├── es-ES/    # Spanish (Spain)
├── es-MX/    # Spanish (Mexico)
├── fr-FR/    # French (France)
├── de-DE/    # German (Germany)
├── ja-JP/    # Japanese (Japan)
├── ko-KR/    # Korean (Korea)
├── pt-BR/    # Portuguese (Brazil)
├── zh-CN/    # Chinese (Simplified)
└── zh-TW/    # Chinese (Traditional)
```

### Example: Adding Spanish Support

```bash
# Create Spanish metadata directory
mkdir -p fastlane/metadata/android/es-ES/changelogs

# Add default Spanish changelog
echo "Correcciones de errores y mejoras de rendimiento" > \
  fastlane/metadata/android/es-ES/changelogs/default.txt

# Add version-specific Spanish changelog
echo "Versión 1.2.0

🎮 Nuevo en esta versión:
• Modo Torneo
• 5 Nuevas Especies de Coral
• Emparejamiento Mejorado
• Corrección de errores" > \
  fastlane/metadata/android/es-ES/changelogs/52.txt
```

## Best Practices

### 1. Stay Under 500 Characters

Play Store limits release notes to **500 characters** per language.

**Check length:**

```bash
wc -c fastlane/metadata/android/en-US/changelogs/52.txt
```

### 2. User-Focused Content

❌ **Bad:**

```
- Refactored GameEngine.ts
- Updated dependencies
- Fixed linter errors
```

✅ **Good:**

```
🎮 New Features:
- Tournament Mode - Compete for prizes!
- 5 New Coral Species

🐛 Bug Fixes:
- Fixed game crashes
- Improved connection stability
```

### 3. Consistent Format

Pick a format and stick with it:

**Option A: Emoji Categories**

```
🎮 New Features:
• Tournament mode
• New coral species

🐛 Bug Fixes:
• Fixed crashes
• Improved stability
```

**Option B: Simple List**

```
Version 1.2.0

New:
- Tournament mode
- New coral species

Fixed:
- Crash during rotation
- Connection timeouts
```

**Option C: Minimal**

```
Bug fixes and performance improvements
```

### 4. Update for Every Release

Make release notes part of your release checklist:

1. ✅ Bump version number
2. ✅ Update changelog file or GitHub Variable
3. ✅ Run deployment workflow
4. ✅ Verify in Play Console

## Workflow Integration

### Preview (Internal Testing)

```yaml
CHANGELOG: ${{ vars.ANDROID_CHANGELOG_PREVIEW || 'Bug fixes and performance improvements for internal testing' }}
```

When you run the preview deployment:

1. Uses `ANDROID_CHANGELOG_PREVIEW` if set
2. Falls back to "Bug fixes and performance improvements for internal testing"
3. Upload includes release notes automatically

### Production

```yaml
CHANGELOG: ${{ vars.ANDROID_CHANGELOG_PRODUCTION || 'Bug fixes and performance improvements' }}
```

When you run the production deployment:

1. Uses `ANDROID_CHANGELOG_PRODUCTION` if set
2. Falls back to "Bug fixes and performance improvements"
3. Creates **draft** release with notes included

## Troubleshooting

### Release Notes Not Showing Up

1. **Check GitHub Action logs** - Look for "Uploaded to Production (draft) with changelog: ..."
2. **Verify Play Console** - Check the draft release → Release notes section
3. **Check character limit** - Must be under 500 characters
4. **Verify file encoding** - Must be UTF-8

### Wrong Language Showing

1. **Check directory names** - Must match Play Store language codes exactly
2. **Verify file exists** - Each language needs its own changelogs directory
3. **Check Play Console** - Ensure language is enabled for your app

### GitHub Variable Not Working

1. **Check variable name** - Must be exactly `ANDROID_CHANGELOG_PREVIEW` or `ANDROID_CHANGELOG_PRODUCTION`
2. **Verify scope** - Must be a Repository Variable, not a Secret
3. **Check workflow file** - Ensure it references `${{ vars.ANDROID_CHANGELOG_* }}`

## Example: Complete Release Flow

### 1. Create Release Notes

**Option A: Use GitHub Variable**

```bash
# Go to GitHub → Settings → Variables
# Set ANDROID_CHANGELOG_PRODUCTION:
🎮 Coral Clash v1.2.0

New Features:
• Tournament Mode - Weekly competitions!
• 5 New Coral Species - Expand your reef
• Improved Matchmaking - Find games faster

Bug Fixes:
• Fixed whale rotation crashes
• Improved connection stability
```

**Option B: Use Version File**

```bash
# Create changelog for version code 52
cat > fastlane/metadata/android/en-US/changelogs/52.txt << 'EOF'
🎮 Coral Clash v1.2.0

New Features:
• Tournament Mode - Weekly competitions!
• 5 New Coral Species - Expand your reef
• Improved Matchmaking - Find games faster

Bug Fixes:
• Fixed whale rotation crashes
• Improved connection stability
EOF

git add fastlane/metadata/android/en-US/changelogs/52.txt
git commit -m "docs: add release notes for v1.2.0"
git push
```

### 2. Run Deployment

```bash
# Trigger deployment via GitHub Actions
# or manually dispatch workflow
```

### 3. Verify in Play Console

1. Go to Play Console → Release → Production
2. Find the draft release
3. Verify release notes are populated
4. Submit for review

## Summary

✅ **Automated** - Release notes uploaded automatically
✅ **Flexible** - Three methods to suit your workflow
✅ **Multi-language** - Support for 10+ languages
✅ **Version-controlled** - Track release notes in git
✅ **Manual override** - GitHub Variables for quick changes

**Default behavior:** If nothing is configured, uses "Bug fixes and performance improvements"

**Recommended setup:**

- Use GitHub Variables (`ANDROID_CHANGELOG_*`) for quick iteration
- Switch to version-specific files when stable
- Add multi-language support before international launch
