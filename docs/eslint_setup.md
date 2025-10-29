# ESLint Setup

## Overview

ESLint is now configured for the Coral Clash project with automatic code quality checks and fixes.

## Auto-Fix on Save

Your VS Code is configured to automatically:

1. **Format code** with Prettier
2. **Organize imports** - removes unused imports and sorts them
3. **Fix ESLint issues** - fixes auto-fixable problems

Just save any file (`Cmd+S`) and these will run automatically!

## Manual Commands

Run these commands from the project root:

```bash
# Check all files for linting issues
yarn lint

# Auto-fix all files
yarn lint:fix

# Check only src/ directory
yarn lint:src

# Auto-fix only src/ directory
yarn lint:src:fix
```

## What It Catches

### Auto-Fixable

- Unused imports (via organize imports on save)
- Some code style issues
- Spacing and formatting (via Prettier)

### Warnings (shown in VS Code)

- Unused variables and function parameters
- Unused React Native styles
- React Hooks dependency issues
- Potential bugs

### Errors (must fix manually)

- React Hooks violations (hooks called conditionally)
- Syntax errors

## Configuration Files

- `eslint.config.js` - Main ESLint configuration
- `.vscode/settings.json` - VS Code auto-fix settings

## Tips

1. **Prefix with underscore** - If you intentionally want to keep an unused variable, prefix it with `_`:

   ```javascript
   const _unusedVar = something; // Won't warn
   ```

2. **React imports** - The `React` import itself is ignored as unused (React Native doesn't need it)

3. **Save all files** - Press `Cmd+K S` in VS Code to save all open files and trigger auto-fix on all of them

4. **Real issues** - The React Hooks errors in `BaseCoralClashBoard.js` are real issues that should be fixed (hooks being called conditionally)

## Next Steps

You may want to:

- Fix the React Hooks violations in `BaseCoralClashBoard.js`
- Remove genuinely unused imports/variables gradually
- Add ESLint check to CI/CD pipeline
