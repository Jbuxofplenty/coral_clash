# Coral Clash Shared Library - Source of Truth

This directory contains the **authoritative source** for all game logic, shared between the React Native mobile app and Firebase Cloud Functions.

## Structure

```
shared/
├── game/
│   ├── coralClash.ts      # Main game engine (re-exports from src/hooks/coralClash.ts)
│   ├── gameState.ts       # Game state serialization/deserialization
│   └── index.ts           # Public API
├── package.json           # Shared library package definition
├── tsconfig.json          # TypeScript configuration
└── README.md             # This file
```

## Purpose

The shared library ensures:

- **Security**: Server validates all moves to prevent cheating
- **Consistency**: Same game rules on client and server
- **Single source of truth**: No duplicate game logic
- **AI opponents**: Functions can simulate gameplay

## Usage

### In React Native App

```typescript
import { CoralClash, DEFAULT_POSITION, exportGameState, importGameState } from '../shared/game';

const game = new CoralClash(DEFAULT_POSITION);
const moves = game.moves({ verbose: true });

// Export game state (for saving to local storage or database)
const gameState = exportGameState(game);

// Import game state (for loading from storage)
importGameState(game, gameState);
```

### In Firebase Functions

```javascript
const { CoralClash } = require('../shared/game/coralClash');
const { createGameSnapshot, restoreGameFromSnapshot } = require('../shared/game/gameState');

// Create a lightweight snapshot for Firestore
const game = new CoralClash(DEFAULT_POSITION);
const snapshot = createGameSnapshot(game);

// Save to Firestore
await db.collection('games').doc(gameId).update({ gameState: snapshot });

// Restore from Firestore
const gameDoc = await db.collection('games').doc(gameId).get();
const restoredGame = new CoralClash();
restoreGameFromSnapshot(restoredGame, gameDoc.data().gameState);
```

## Game Engine

The core game engine is located in `src/hooks/coralClash.ts` and contains:

- Complete Coral Clash rule implementation
- Move generation and validation
- Special mechanics (whale movement, coral placement/removal)
- Win condition checking (checkmate, coral victory, resignation)
- FEN notation support
- PGN import/export

## Game State Management

The `gameState.ts` module provides utilities for serializing and deserializing game state:

**Key Functions**:

- `exportGameState(game)` - Full export with history (for tests/debugging)
- `importGameState(game, fixture)` - Restore complete game state
- `createGameSnapshot(game)` - Lightweight snapshot (for Firestore)
- `restoreGameFromSnapshot(game, snapshot)` - Restore from snapshot
- `applyFixture(game, fixture)` - Load test fixtures

**Use Cases**:

- **Firestore Storage**: Use `createGameSnapshot()` for efficient storage
- **Game Replay**: Use `exportGameState()` to capture full history
- **Testing**: Use fixtures for consistent test scenarios
- **Save/Load**: Use snapshots for quick save/load functionality

## Security Model

1. **Client-side**: Use game engine for UI and move preview
2. **Server-side**: Validate ALL moves before updating database
3. **Never trust client**: Always validate moves in Cloud Functions

## Development

When making changes to game rules:

1. Update `src/hooks/coralClash.ts`
2. Test in the mobile app
3. Deploy Functions to apply server-side validation
4. Ensure both client and server use the same logic

## Notes

- The game engine is written in TypeScript
- Firebase Functions use JavaScript but can import the TypeScript directly
- Node.js will handle TypeScript compilation when importing
