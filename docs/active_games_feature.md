# Active Games Feature

## Overview

The Active Games feature displays a card on the Home screen showing all ongoing PvP games for the logged-in user. This provides quick access to games in progress and clearly shows which games require the user's attention.

## Components

### ActiveGamesCard

Location: `src/components/ActiveGamesCard.js`

**Purpose:** Display active and pending PvP games on the Home screen.

**Features:**

- Shows list of all active games (pending and in-progress)
- Displays opponent's avatar and name
- Shows game status with appropriate icon and color
- Indicates whose turn it is
- Tap any game to navigate directly to it
- Auto-hides when no active games (seamless UX)
- Loading state with spinner
- Sorted by most recently updated

**Status Indicators:**

| Status                 | Icon               | Color            | Condition                      |
| ---------------------- | ------------------ | ---------------- | ------------------------------ |
| "Your turn"            | play-circle        | Success (Green)  | Active game, user's turn       |
| "Opponent's turn"      | hourglass          | Secondary (Gray) | Active game, opponent's turn   |
| "Waiting for opponent" | hourglass          | Warning (Yellow) | Pending game, user is creator  |
| "Your move to accept"  | exclamation-circle | Info (Blue)      | Pending game, user is opponent |

## Backend Integration

### Updated Endpoints

#### `getActiveGames`

Location: `functions/routes/game.js`

**Enhancements:**

- Fetches opponent information (display name, avatar)
- Returns enriched game data with opponent details
- Sorts games by most recent update
- Handles both creator and opponent perspectives

**Response Format:**

```javascript
{
  success: true,
  games: [
    {
      id: 'game123',
      creatorId: 'user1',
      opponentId: 'user2',
      status: 'active',
      currentTurn: 'user1',
      opponentDisplayName: 'Player #1234',
      opponentAvatarKey: 'dolphin',
      updatedAt: Timestamp,
      // ... other game data
    }
  ]
}
```

## User Experience Flow

### First-time User (No Active Games)

1. User opens Home screen
2. No Active Games card is shown (auto-hidden)
3. User can start new game modes from the game mode cards

### User with Active Games

1. User opens Home screen
2. Active Games card appears at the top
3. Card shows count: "X games in progress"
4. Each game displays:
    - Opponent's avatar and name
    - Status with icon
    - Chevron indicating tappability

### Navigating to a Game

1. User taps on any game in the list
2. Navigates to Game screen with:
    - `gameId`: The specific game ID
    - `isPvP`: true flag

### Status Visual Cues

**Your Turn (Green):**

- Clear visual indicator that action is required
- Encourages immediate engagement

**Opponent's Turn (Gray):**

- Subtle indicator
- User can still view game but knows they're waiting

**Waiting for Opponent (Yellow):**

- Pending game invitation sent
- Waiting for opponent to accept

**Your Move to Accept (Blue):**

- Pending game invitation received
- User needs to accept/decline (can also use notification dropdown)

## Styling & Design

**Card Design:**

- Matches Product card styling (consistent UI)
- Rounded corners (12px)
- Shadow elevation for depth
- Header with icon and game count
- Divider lines between games

**Game Items:**

- Horizontal layout with avatar on left
- Opponent name and status stacked
- Chevron on right indicating tappability
- Touch feedback (opacity 0.7)

**Colors:**

- Adapts to theme (light/dark mode)
- Status colors for quick scanning
- Proper contrast ratios for accessibility

## Integration with Other Features

### Works with:

- **usePvPGame Hook**: Fetches and manages game state
- **Notification System**: Games created via notifications appear here
- **Friends Screen**: Games initiated from Friends screen appear here
- **Game Screen**: Tapping navigates to actual game

### Auto-refresh:

- Loads on mount
- User can pull to refresh (if ScrollView supports it)
- Real-time updates possible via Firestore listeners (future enhancement)

## Future Enhancements

Potential improvements:

1. **Real-time updates**: Use Firestore listeners for live game updates
2. **Pull-to-refresh**: Add manual refresh capability
3. **Swipe actions**: Swipe to resign/cancel game
4. **Game preview**: Show board thumbnail or last move
5. **Time controls**: Display time remaining (if using timed games)
6. **Notifications badge**: Show count of games requiring attention
7. **Filter/sort options**: Sort by status, time, opponent
8. **Empty state**: Show encouraging message when no games
9. **Quick accept**: Accept pending games directly from card
10. **Game history**: Expand card to show completed games

## Code Structure

```
src/
├── components/
│   ├── ActiveGamesCard.js       # Main component
│   └── index.js                 # Export
├── screens/
│   └── Home.js                  # Integration point
└── hooks/
    └── usePvPGame.js            # Game state management

functions/
└── routes/
    └── game.js                  # Backend API
```

## Testing Checklist

- [ ] Card appears when games exist
- [ ] Card hides when no games
- [ ] Loading state shows correctly
- [ ] Opponent names display correctly
- [ ] Avatars render properly
- [ ] Status indicators show correct color/icon
- [ ] "Your turn" shows for current player
- [ ] "Opponent's turn" shows for waiting player
- [ ] Pending games show appropriate status
- [ ] Tapping navigates to correct game
- [ ] Multiple games display in order
- [ ] Dark mode styling works
- [ ] Light mode styling works
- [ ] Long opponent names truncate properly
- [ ] Works with different avatar types

## Performance Considerations

- Efficient data fetching (single API call)
- Conditional rendering (hides when empty)
- Sorted on backend (no client sorting)
- Minimal re-renders with React hooks
- Avatar images cached
- List virtualization not needed (typically < 10 games)
