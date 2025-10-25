# Tutorial Auto-Play Feature

## Overview

Added an optional auto-play feature to tutorial scenarios that automatically demonstrates moves in a looping sequence. This enhances the learning experience by showing dynamic examples instead of static board positions.

## Implementation

### 1. Tutorial Scenario Structure

Added an optional `autoPlaySequence` property to tutorial scenarios in `src/constants/tutorialScenarios.js`:

```javascript
autoPlaySequence: {
    moves: [
        { from: 'd4', to: 'g7' }, // Array of moves to play
    ],
    delayBetweenMoves: 1000,  // Milliseconds between each move
    pauseAtEnd: 2000,          // Milliseconds to pause before resetting
    showPath: true,            // Optional: Show highlighted path before move (default: true)
    showAllMoves: false,       // Optional: Show all possible moves instead of just trajectory (default: false)
}
```

### 2. ScenarioBoard Component Updates

Enhanced `src/screens/ScenarioBoard.js` with:

#### State Management

- `isAutoPlaying`: Tracks if sequence is currently playing
- `autoPlayEnabled`: Toggle for user control of auto-play

#### Auto-Play Logic

- Uses `useEffect` hook to manage the auto-play sequence
- Plays moves sequentially with configurable delays
- Pauses at the end to let users observe the final state
- Resets to initial state and loops continuously
- Proper cleanup of timeouts on unmount or when disabled

#### User Interface

- Toggle button appears when a scenario has `autoPlaySequence`
- Shows "Play Demo" or "Pause Auto-Play" based on state
- Button styling uses theme colors
- Disables manual piece selection during auto-play to prevent conflicts
- Allows manual piece selection when paused to explore the board

#### Path Highlighting

- Before each move, displays the specific path/trajectory the piece will take (unless `showPath: false`)
- Calculates intermediate squares from source to destination (e.g., d4 → e5 → f6 → g7)
- Highlights each square along the path, including the starting and ending positions
- Uses the existing `Moves` component to show highlighted squares
- Path is shown after a 0.5s delay, with the board visible for 1.5s first
- Path is cleared immediately after the move executes
- Visual feedback helps users understand the exact route the piece will travel

### 3. Scenarios with Auto-Play

#### Movement Demonstration Scenarios

All piece movement scenarios now feature continuous movement sequences:

**Dolphin Movement**

- Moves around the board: d4 → h8 → a8 → a1 → d4
- Shows diagonal, horizontal, and vertical movement
- `showAllMoves: true` - displays all possible moves before each move

**Turtle Movement**

- Moves in a rectangular path: d4 → d8 → h8 → h1 → d1 → d4
- Demonstrates horizontal and vertical movement only
- `showAllMoves: true` - displays all straight-line moves

**Pufferfish Movement**

- Moves diagonally around: d4 → h8 → e5 → a1 → d4
- Shows diagonal movement in all directions
- `showAllMoves: true` - displays all diagonal moves

**Crab Movement**

- Moves in a small square pattern, one square at a time
- 8-move sequence showing slow, steady movement
- `showAllMoves: true` - displays 4 adjacent squares

**Octopus Movement**

- Moves in a diamond pattern, one diagonal square at a time
- 6-move sequence demonstrating diagonal limitation
- `showAllMoves: true` - displays 4 diagonal squares

#### Action Demonstration Scenarios

**Capture Scenario**

- Demonstrates a Dolphin capturing a Crab
- Shows the specific path from d4 → e5 → f6 → g7
- 3 second delay, 5 second pause
- Path highlighting shows exact trajectory (not all moves)

**Hunter Effect Scenario**

- Shows a Crab moving onto coral (hunter pieces stop on coral)
- 1.5 second delay, 2.5 second pause
- Path highlighting shows specific trajectory

**Gatherer Effect Scenario**

- Demonstrates an Octopus moving and placing coral
- 1.5 second delay, 2.5 second pause
- Path highlighting shows specific trajectory

## Benefits

1. **Enhanced Learning**: Dynamic demonstrations are more engaging than static examples
2. **Continuous Movement**: Pieces move continuously around the board showing their full capabilities
3. **Path Visualization**: Two modes - show all possible moves OR show exact trajectory
4. **Self-Explanatory**: Users can watch the sequence without manual interaction
5. **Repeating Loops**: Continuous playback ensures users can observe multiple times
6. **User Control**: Toggle button allows users to pause and explore manually
7. **Flexible Configuration**: Easy to add auto-play to any scenario with custom timing and behavior

## Features Summary

- **8 scenarios with auto-play**: All 5 movement scenarios + 3 action scenarios
- **Multiple move sequences**: Pieces move continuously (up to 8 moves in a sequence)
- **Two highlighting modes**: `showAllMoves` for capabilities, path-only for specific actions
- **Configurable timing**: Independent control of delay between moves and pause at end
- **Smart initialization**: 1.5s initial view + 0.5s before highlighting
- **Clean state management**: Proper reset between loops, clear cleanup on pause

## Future Enhancements

- Add auto-play to whale movement (complex two-piece movement)
- Add auto-play to checkmate sequences
- Add speed controls for users who want faster/slower playback
- Visual indicators showing which piece is currently moving
- Option to highlight the piece that's about to move next
