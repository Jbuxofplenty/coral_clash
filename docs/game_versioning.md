# Game Engine Versioning

## Overview

The Coral Clash game engine uses semantic versioning to ensure frontend and backend compatibility. This prevents issues where the client and server are running different versions of the game logic.

## Version Structure

- **Current Version:** `1.0.0`
- **Location:** `shared/game/`
- **Versioned Code:** `shared/game/v1.0.0/`

## How It Works

### 1. **Versioned Folders**

Game logic is organized in versioned folders:

```
shared/game/
├── v1.0.0/
│   ├── coralClash.ts    # Core game engine
│   ├── gameState.ts     # State management
│   └── index.ts         # Version exports
├── index.ts             # Main export (defaults to current version)
└── ...
```

### 2. **Version Constant**

```typescript
// shared/game/index.ts
export const GAME_VERSION = '1.0.0';
```

### 3. **Backend Validation**

All game APIs validate the client version:

```javascript
// functions/routes/game.js
function validateGameVersion(clientVersion) {
    const version = clientVersion || GAME_VERSION;

    if (version !== GAME_VERSION) {
        throw new HttpsError(
            'failed-precondition',
            `Game version mismatch. Client: ${version}, Server: ${GAME_VERSION}`,
        );
    }

    return version;
}
```

### 4. **Frontend Integration**

The frontend automatically sends the current version with each API call:

```javascript
// src/hooks/useFirebaseFunctions.js
import { GAME_VERSION } from '../../shared/game';

const makeMove = async ({ gameId, move }) => {
    const callable = httpsCallable(functions, 'makeMove');
    const result = await callable({
        gameId,
        move,
        version: GAME_VERSION, // ✅ Version sent automatically
    });
    return result.data;
};
```

### 5. **Game Document Storage**

Each game stores its engine version:

```javascript
const gameData = {
    creatorId,
    opponentId,
    status: 'pending',
    version: GAME_VERSION, // ✅ Stored in Firestore
    // ... other fields
};
```

## Version Updates

### When to Increment Version

- **Major (X.0.0):** Breaking changes to game rules or move validation
- **Minor (1.X.0):** New features that are backward compatible
- **Patch (1.0.X):** Bug fixes that don't affect game logic

### How to Add a New Version

1. **Create new version folder:**

    ```bash
    mkdir shared/game/v1.1.0
    cp shared/game/v1.0.0/* shared/game/v1.1.0/
    ```

2. **Update version constant:**

    ```typescript
    // shared/game/index.ts
    export const GAME_VERSION = '1.1.0';
    ```

3. **Update getGameEngine:**

    ```typescript
    export function getGameEngine(version: string = GAME_VERSION) {
        switch (version) {
            case '1.0.0':
                return require('./v1.0.0');
            case '1.1.0':
                return require('./v1.1.0');
            default:
                throw new Error(`Unsupported game version: ${version}`);
        }
    }
    ```

4. **Update exports:**

    ```typescript
    // Export new version as default
    export * from './v1.1.0';
    ```

5. **Deploy backend first, then frontend:**
    - Backend supports both versions during transition
    - Frontend users gradually update to new version
    - Old version can be deprecated after transition period

## Benefits

✅ **Version Mismatch Detection** - Prevents incompatible client/server interactions
✅ **Backward Compatibility** - Support multiple versions simultaneously
✅ **Safe Updates** - Deploy backend first, frontend follows
✅ **Error Prevention** - Clear error messages for version mismatches
✅ **Audit Trail** - Every game records which version it used

## Error Handling

If a version mismatch occurs, users see:

```
Game version mismatch. Client: 1.0.0, Server: 1.1.0. Please update your app.
```

## APIs That Validate Version

- ✅ `makeMove` - Validates on every move
- ✅ `makeComputerMove` - Validates before AI move
- ✅ `createGame` - Stores version in game document
- ✅ `createComputerGame` - Stores version in game document

## Future Enhancements

- **Automatic version migration** - Convert old game states to new format
- **Version-specific UI** - Show different interfaces per version
- **Deprecation warnings** - Notify users of upcoming version changes
- **Rollback support** - Revert to previous version if needed
