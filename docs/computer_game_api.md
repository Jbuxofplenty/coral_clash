# Computer Game API Documentation

This document describes the APIs and hooks for playing Coral Clash against the computer.

## Overview

The computer game system allows users to play against an AI opponent. The system handles:

- Creating a game against the computer
- Making moves with server-side validation
- Automatic computer move generation
- Push notifications when the computer makes a move
- Game state synchronization

## Backend APIs

### `createGame`

Creates a new game against another player.

**Cloud Function:** `createGame`

**Parameters:**

```javascript
{
  opponentId: 'user123',  // Opponent's user ID
  timeControl: {          // Optional
    type: 'unlimited'    // or 'timed'
  }
}
```

**Returns:**

```javascript
{
  success: true,
  gameId: 'game123',
  message: 'Game created successfully'
}
```

### `createComputerGame`

Creates a new game against the computer.

**Cloud Function:** `createComputerGame`

**Parameters:**

```javascript
{
  timeControl: {        // Optional
    type: 'unlimited'  // or 'timed'
  },
  difficulty: 'random' // 'random', 'easy', 'medium', 'hard'
}
```

**Returns:**

```javascript
{
  success: true,
  gameId: 'game123',
  message: 'Computer game created successfully'
}
```

**Game Document Structure:**

```javascript
{
  creatorId: 'user123',
  opponentId: 'computer',
  opponentType: 'computer',
  difficulty: 'random',
  status: 'active',
  currentTurn: 'user123',  // User always goes first (white)
  timeControl: { type: 'unlimited' },
  moves: [],
  gameState: { /* initialized game state */ },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### `makeMove` (Enhanced)

Makes a move in any game (PvP or computer). For computer games, the server automatically:

1. Validates the user's move
2. Updates the game state
3. Makes a computer move
4. Sends a notification to the user
5. Returns both moves in the response

**Cloud Function:** `makeMove`

**Parameters:**

```javascript
{
  gameId: 'game123',
  move: {
    from: 'e2',
    to: 'e4',
    promotion: 'q',  // Optional
    whaleSecondSquare: 'e5',  // Optional, for whale moves
    coralPlaced: true,  // Optional, for gatherer moves
    coralRemoved: true,  // Optional, for hunter moves
    coralRemovedSquares: ['d3', 'e3']  // Optional, for whale moves
  }
}
```

**Returns:**

```javascript
{
  success: true,
  message: 'Move made successfully',
  gameState: { /* updated game state */ },
  gameOver: false,
  result: undefined,  // or { winner: 'w', reason: 'checkmate' }
  computerMove: {     // Only present for computer games
    move: { /* computer's move */ },
    gameState: { /* game state after computer move */ },
    gameOver: false,
    result: undefined
  }
}
```

## Frontend Hooks

### `usePvPGame`

Enhanced to include computer game functionality.

**Import:**

```javascript
import { usePvPGame } from '../hooks/usePvPGame';
```

**Usage:**

```javascript
const { startComputerGame, loading } = usePvPGame();

// Start a game
const handleStartGame = async () => {
    try {
        const result = await startComputerGame();
        // Navigate to game screen with result.gameId
        navigation.navigate('Game', { gameId: result.gameId });
    } catch (error) {
        console.error('Failed to start game:', error);
    }
};
```

**New Methods:**

#### `startComputerGame(timeControl, difficulty)`

Starts a new game against the computer.

**Parameters:**

- `timeControl` (Object, optional): Time control settings
- `difficulty` (string, optional): Difficulty level (default: 'random')

**Returns:** Promise<{ success: boolean, gameId: string }>

**Example:**

```javascript
// Start with default settings
const game = await startComputerGame();

// Start with custom difficulty
const game = await startComputerGame(null, 'medium');

// Start with time control
const game = await startComputerGame(
    {
        type: 'timed',
        minutes: 10,
    },
    'hard',
);
```

### `useFirebaseFunctions`

Enhanced to include computer game creation.

**New Methods:**

#### `createComputerGame(timeControl, difficulty)`

Low-level function to create a computer game.

**Parameters:**

- `timeControl` (Object, optional): Time control settings
- `difficulty` (string, optional): Difficulty level (default: 'random')

**Returns:** Promise<{ success: boolean, gameId: string }>

## Notifications

### Opponent Move Notification

When any opponent (computer or human) makes a move, the user receives a push notification.

**Notification Data:**

```javascript
{
  title: 'Your Turn',
  body: 'The computer made a move', // or "{PlayerName} made a move"
  data: {
    type: 'move_made',
    gameId: 'game123',
    from: 'computer', // or userId for PvP
    fromName: 'Computer', // or player display name
    isComputer: true // or false for PvP
  }
}
```

### NotificationDropdown Configuration

The `NotificationDropdown` component handles opponent move notifications for both PvP and computer games.

**Config:**

```javascript
move_made: {
  title: 'Your Turn',
  getMessage: (displayName, result, data) => {
    // Check if it's a computer move
    if (data?.isComputer || displayName === 'Computer') {
      return 'The computer made a move';
    }
    return `${displayName || 'Someone'} made a move`;
  },
  icon: { name: 'play-circle', family: 'font-awesome' },
  showAvatar: true,
  showActions: false,
}
```

**Behavior:**

- Works for both PvP and computer games
- Shows appropriate message based on opponent type
- Displays opponent avatar for PvP games
- Notification only shows if the game is not currently active/visible
- Tapping the notification navigates to the game
- Auto-dismisses after 5 seconds

## Move Flow for Computer Games

### User Makes a Move

1. Frontend calls `makeMove` with user's move
2. Backend validates move against current game state
3. Backend updates game state with user's move
4. Backend checks if game is over
5. If game continues and it's computer's turn:
    - Backend generates random legal move
    - Backend validates computer's move
    - Backend updates game state
    - Backend sends push notification to user
6. Backend returns both moves to frontend

### Computer Move Generation

Currently uses simple random move selection:

```javascript
const moves = game.moves({ verbose: true });
const selectedMove = moves[Math.floor(Math.random() * moves.length)];
```

**Future Enhancement:** The `difficulty` parameter can be used to implement:

- `easy`: Prioritize bad moves, avoid good tactics
- `medium`: Random moves with basic tactical awareness
- `hard`: Minimax algorithm with position evaluation

## Game State Management

### Identifying Computer Games

Computer games have these distinguishing properties:

```javascript
game.opponentType === 'computer';
game.opponentId === 'computer';
```

### Turn Management

- User always plays as White (goes first)
- `currentTurn` field alternates between `userId` and `'computer'`
- When `currentTurn === 'computer'`, the backend automatically makes a move

### Stats Tracking

Computer games update user stats normally:

```javascript
// Win
stats.gamesPlayed += 1;
stats.gamesWon += 1;

// Loss
stats.gamesPlayed += 1;
stats.gamesLost += 1;

// Draw
stats.gamesPlayed += 1;
stats.gamesDraw += 1;
```

Computer stats are not tracked.

## Error Handling

### Computer Move Failures

If the computer fails to make a move:

- Error is logged but doesn't fail the user's move
- Game state is still updated with user's move
- User can continue playing (manual recovery may be needed)

### Move Validation

All moves (user and computer) are validated server-side using the game engine:

```javascript
const validation = validateMove(currentFen, move);
if (!validation.valid) {
    throw new Error(`Invalid move: ${validation.error}`);
}
```

This prevents cheating and ensures game integrity.

## Testing

### Testing Computer Game Creation

```javascript
// In your test file or component
const { startComputerGame } = usePvPGame();

const result = await startComputerGame();
console.log('Game ID:', result.gameId);
```

### Testing Move Flow

```javascript
// Make a move
const result = await makeMove(gameId, {
    from: 'e2',
    to: 'e4',
});

console.log('User move:', result.gameState);
console.log('Computer move:', result.computerMove);
```

## Future Enhancements

1. **Difficulty Levels**: Implement AI algorithms for different skill levels
2. **Opening Book**: Use common chess openings for better gameplay
3. **Time Controls**: Add timing constraints for computer moves
4. **Analysis Mode**: Provide move suggestions and analysis
5. **Replay**: Allow users to review computer games
6. **Undo**: Allow users to take back moves in computer games

## Related Files

- `functions/routes/game.js` - Backend game logic
- `functions/utils/notifications.js` - Notification sending
- `src/hooks/usePvPGame.js` - Frontend game hook
- `src/hooks/useFirebaseFunctions.js` - Firebase function calls
- `src/components/NotificationDropdown.js` - Notification UI
- `shared/game/coralClash.ts` - Game engine
