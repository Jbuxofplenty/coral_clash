# Game Actions Architecture

## Overview

The game actions architecture follows a **backend-first** approach where all game actions are validated and persisted on the server before being applied to the local game state.

## Architecture Flow

```
User Action → useGameActions Hook → Backend API → Firestore → Apply Locally
```

1. **User performs action** (make move, resign, etc.)
2. **Frontend sends to backend API** via `useGameActions` hook
3. **Backend validates and updates Firestore** (source of truth)
4. **Backend responds with success/failure**
5. **Frontend applies validated action** to local `CoralClash` instance

## Benefits

- ✅ **Backend is source of truth** - prevents cheating and ensures consistency
- ✅ **Validation happens server-side** - secure and reliable
- ✅ **Cleaner separation of concerns** - UI doesn't need to know validation logic
- ✅ **Better error handling** - clear distinction between network and validation errors
- ✅ **Offline support ready** - can queue actions for later sync

## Usage in Components

### 1. Import the hook

```javascript
import { useGameActions } from '../hooks/useGameActions';
```

### 2. Initialize with CoralClash instance

```javascript
const CoralClashBoard = ({ gameId, gameState }) => {
    const coralClash = useCoralClash();
    const [, forceUpdate] = useState(0);

    // Initialize game actions hook
    const { makeMove, resign, undoMove, isProcessing } = useGameActions(
        coralClash,
        gameId,
        () => forceUpdate((n) => n + 1), // Callback to trigger re-render
    );

    // ...
};
```

### 3. Use wrapper functions instead of direct CoralClash calls

**❌ OLD WAY (Don't do this):**

```javascript
// Direct call - no backend sync
coralClash.move({ from: 'e2', to: 'e4' });
```

**✅ NEW WAY (Do this):**

```javascript
// Sends to backend first, then applies locally
await makeMove({ from: 'e2', to: 'e4' });
```

### 4. Handle resignation

```javascript
const handleResignation = async () => {
    Alert.alert('Resign Game', 'Are you sure you want to resign?', [
        { text: 'Cancel', style: 'cancel' },
        {
            text: 'Resign',
            style: 'destructive',
            onPress: async () => {
                const success = await resign();
                if (success) {
                    navigation.goBack();
                }
            },
        },
    ]);
};
```

### 5. Handle undo (local games only)

```javascript
const handleUndo = () => {
    const undoneMove = undoMove();
    if (!undoneMove) {
        Alert.alert('Cannot Undo', 'No moves to undo or undo not allowed in online games.');
    }
};
```

## API Functions

### `makeMove(moveParams)`

Makes a move in the game.

**Parameters:**

```javascript
{
    from: 'e2',        // Required
    to: 'e4',          // Required
    promotion: 'q',    // Optional
    whaleSecondSquare: 'e5',  // Optional (for whale moves)
    coralPlaced: true, // Optional (for gatherer pieces)
    coralRemoved: true, // Optional (for hunter pieces)
    coralRemovedSquares: ['e4', 'e5'] // Optional (for whale coral removal)
}
```

**Returns:** `Promise<Move|null>`

- Returns move object if successful
- Returns null if failed
- Automatically applies move locally after backend validation

**Example:**

```javascript
const move = await makeMove({
    from: 'd2',
    to: 'd4',
});

if (move) {
    console.log('Move successful:', move);
}
```

### `resign()`

Resigns the current game.

**Returns:** `Promise<boolean>`

- Returns true if resignation successful
- Returns false if failed
- Automatically applies resignation locally after backend confirmation

**Example:**

```javascript
const success = await resign();
if (success) {
    navigation.navigate('Home');
}
```

### `undoMove()`

Undoes the last move (local games only).

**Returns:** `Move|null`

- Returns undone move if successful
- Returns null if undo not allowed
- Shows alert if called in online game

**Example:**

```javascript
const undoneMove = undoMove();
if (undoneMove) {
    console.log('Undid move:', undoneMove);
}
```

### `isProcessing`

Boolean flag indicating if an action is currently being processed.

**Usage:**

```javascript
<Button
    title='Make Move'
    disabled={isProcessing}
    onPress={() => makeMove({ from: 'e2', to: 'e4' })}
/>
```

## Backend API Endpoints

### `makeMove`

- **Path:** `functions/routes/game.js`
- **Function:** `exports.makeMove`
- **Validates:** Move legality, turn order, game state
- **Updates:** Firestore game document, player stats (if game ends)
- **Returns:** Move result, game state, computer move (if applicable)

### `resignGame`

- **Path:** `functions/routes/game.js`
- **Function:** `exports.resignGame`
- **Validates:** User is player, game not finished
- **Updates:** Firestore game document, player stats
- **Returns:** Success status, winner

## Error Handling

### Move Validation Errors

```javascript
try {
    await makeMove({ from: 'e2', to: 'e5' }); // Invalid move
} catch (error) {
    // User will see alert: "Invalid Move: Not a legal move"
}
```

### Network Errors

```javascript
try {
    await makeMove({ from: 'e2', to: 'e4' });
} catch (error) {
    // User will see alert: "Connection Error: Failed to send move to server"
}
```

### Turn Order Errors

```javascript
try {
    await makeMove({ from: 'e7', to: 'e5' }); // Not user's turn
} catch (error) {
    // User will see alert: "Invalid Move: Not your turn"
}
```

## Local vs Online Games

### Local Games (gameId = null)

- Moves applied directly to CoralClash instance
- No backend API calls
- Undo is allowed
- Instant response

### Online Games (gameId provided)

- Moves sent to backend first
- Backend validates and persists
- Undo not allowed
- Slight latency for validation

The hook automatically detects which mode to use based on whether `gameId` is provided.

## Migration Guide

If you have existing code using direct `coralClash.move()` calls, update them:

### Before:

```javascript
const result = coralClash.move({ from: 'e2', to: 'e4' });
if (result) {
    // Move was successful
    forceUpdate();
}
```

### After:

```javascript
const result = await makeMove({ from: 'e2', to: 'e4' });
// No need to check result or forceUpdate - hook handles it
```

### Before:

```javascript
coralClash.resign('w');
forceUpdate();
```

### After:

```javascript
await resign();
// Hook applies resignation and triggers re-render
```

## Future Enhancements

Potential additions to the architecture:

1. **Optimistic Updates**: Apply move locally immediately, rollback if backend rejects
2. **Move Queue**: Queue moves when offline, sync when online
3. **Move Undo Request**: Allow requesting undo from opponent
4. **Move Hints**: Backend provides legal move hints
5. **Move History**: Store full move history with annotations
6. **Draw Offers**: Send and respond to draw offers

## Testing

### Unit Tests

```javascript
// Test move validation
it('should reject invalid moves', async () => {
    const { makeMove } = useGameActions(coralClash, 'game123');
    const result = await makeMove({ from: 'e2', to: 'e5' });
    expect(result).toBeNull();
});

// Test resignation
it('should resign game successfully', async () => {
    const { resign } = useGameActions(coralClash, 'game123');
    const success = await resign();
    expect(success).toBe(true);
});
```

### Integration Tests

- Test full flow from UI action to backend to local state
- Test computer move responses
- Test error scenarios (network failure, validation errors)
- Test local vs online game differences
