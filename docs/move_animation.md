# Move Animation System

## Overview

The move animation system provides smooth visual feedback when pieces move on the board, both for player moves and opponent moves received from the server.

## Components

### AnimatedPiece Component

Located at `src/components/AnimatedPiece.js`

**Purpose**: Renders an animated piece that moves along a path from the source square to the destination square.

**Key Features**:

- Builds a path of intermediate squares for the piece to "hop" through
- For straight-line moves (horizontal, vertical, diagonal), shows the piece visiting each square
- For knight moves or single-square moves, jumps directly to the destination
- Handles whale pieces with proper orientation
- Provides visual feedback with opacity changes during movement
- Configurable animation duration based on move type

**Props**:

- `move` - Move data with from/to squares
- `piece` - Piece being moved {type, color, role}
- `size` - Board size in pixels
- `boardFlipped` - Whether board is flipped
- `userColor` - User's color for piece styling
- `onComplete` - Callback when animation finishes

### BaseCoralClashBoard Updates

**Animation State**:

- `animatingMove` - Current move being animated
- `animatingPiece` - Piece data being animated
- `lastAnimatedMoveRef` - Tracks last animated move to prevent duplicates

**Triggering Animations**:

1. **Player Moves** (Local Games):
   - Animation triggered in `executeMove()` after move is applied
   - Piece data captured before the move
   - Animation plays immediately

2. **Opponent Moves** (Online Games):
   - Animation triggered in `handleStateUpdate()` when Firestore updates
   - Checks if move is new using `lastAnimatedMoveRef`
   - Extracts move data from game history

### Pieces Component Updates

**Hiding Animated Pieces**:

- Added `animatingSquare` prop to indicate which square has a piece being animated
- Regular pieces are hidden if their square matches `animatingSquare`
- Whale pieces are hidden if either of their squares matches `animatingSquare`
- Touchable areas remain active during animation

## Animation Flow

### Local Move

1. Player makes a move by clicking
2. `executeMove()` captures piece data before applying move
3. Move is applied to game state
4. `animatingMove` and `animatingPiece` state are set
5. `AnimatedPiece` renders and animates the piece
6. Real piece at destination is hidden via `animatingSquare` prop
7. When animation completes, `onComplete` clears animation state
8. Real piece becomes visible at destination

### Opponent Move (Online)

1. Firestore listener receives game state update
2. `handleStateUpdate()` is called
3. Last move is extracted from game history
4. Move is checked against `lastAnimatedMoveRef` to prevent duplicates
5. `animatingMove` and `animatingPiece` state are set
6. `AnimatedPiece` renders and animates the piece
7. Real piece at destination is hidden via `animatingSquare` prop
8. When animation completes, `onComplete` clears animation state
9. Real piece becomes visible at destination

### History Navigation (Forward)

1. Player clicks forward button
2. `handleHistoryForward()` extracts the next move from history
3. Move is animated normally (from → to)
4. History index is updated
5. Board state updates to show the new position
6. Animation completes
7. **Banner displays**: "Viewing past moves - return to current to play"

### History Navigation (Backward)

1. Player clicks back button
2. `handleHistoryBack()` extracts the current move from history
3. Move is animated in **reverse** (to → from)
4. History index is updated
5. Board state updates to show the previous position
6. Animation completes
7. **Banner displays**: "Viewing past moves - return to current to play"

### Undo

1. Player clicks undo or undo is approved
2. `handleUndo()` extracts the last move from history
3. Move is animated in **reverse** (to → from)
4. `onUndo()` callback removes move from game engine
5. Board state updates
6. Animation completes

### Game Reset

1. Reset is approved (computer games auto-approve)
2. Backend clears moves array and resets game state
3. Firestore listener triggers `handleStateUpdate()`
4. Detects history length went from >0 to 0
5. **Clears all animations** instead of animating
6. Board snaps back to starting position

## Timing Configuration

- **Single-square moves**: 200ms
- **Multi-square moves (first hop)**: 200ms
- **Multi-square moves (subsequent hops)**: 120ms
- **Knight moves**: 200ms
- **Pause between squares**: 80ms

## Edge Cases Handled

1. **Whale Moves**: Properly handles 2x1 pieces with orientation
2. **Board Flip**: Animations work correctly when board is flipped
3. **History Navigation**: Animates pieces when stepping through move history
4. **Reverse Animation**: Undo and history back show pieces moving in reverse
5. **Duplicate Moves**: Tracks animated moves to prevent re-animating same move
6. **Game State Sync**: Works with both local and online game modes
7. **Game Reset**: Clears animations when game is reset to prevent confusion
8. **Multi-step Undo**: Animates the last move being undone

## Future Enhancements

Potential improvements:

- Capture animations (show captured piece flying off board)
- Special effects for check, checkmate, or coral events
- Configurable animation speed in settings
- Smooth easing functions for more natural movement
- Trail effects for long-range pieces
