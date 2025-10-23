# Matchmaking System

## Overview

The matchmaking system allows players to join a queue and be automatically matched with random opponents for PvP games. When two players are in the queue, they are automatically paired and a game is created.

## Architecture

### Backend (Firebase Functions)

#### Cloud Functions

1. **`joinMatchmaking`**
    - Adds the current user to the matchmaking queue
    - Validates that the user doesn't already have active games
    - Automatically attempts to find a match
    - **Path**: `functions/routes/matchmaking.js`

2. **`leaveMatchmaking`**
    - Removes the current user from the matchmaking queue
    - **Path**: `functions/routes/matchmaking.js`

3. **`getMatchmakingStatus`**
    - Returns the current queue count and user's queue status
    - **Path**: `functions/routes/matchmaking.js`

#### Firestore Triggers

1. **`onPlayerJoinQueue`**
    - Triggered when a player document is created in `matchmakingQueue`
    - Attempts to match the new player with another waiting player
    - **Path**: `functions/routes/matchmaking.js`

2. **`cleanupStaleMatchmakingEntries`**
    - Scheduled function (runs every 5 minutes)
    - Removes queue entries older than 10 minutes to prevent stale data
    - **Path**: `functions/routes/matchmaking.js`

#### Helper Functions

- **`tryMatchPlayers(userId)`**
    - Finds another waiting player and creates a match
    - Updates both players' status to "matched"
    - Creates a new game and removes both from the queue

- **`createMatchedGame(player1Id, player2Id)`**
    - Creates an active PvP game between two matched players
    - Randomly assigns white/black colors
    - Sends notifications to both players
    - Game starts immediately (no pending state)

### Database Structure

#### matchmakingQueue Collection

```javascript
{
  userId: string,           // Document ID and user's UID
  displayName: string,      // User's display name
  discriminator: string,    // User's discriminator
  avatarKey: string,        // User's avatar
  joinedAt: timestamp,      // When they joined the queue
  status: string           // 'searching' or 'matched'
}
```

#### Notifications

When a match is found, a notification with type `match_found` is created for both players:

```javascript
{
  userId: string,
  type: 'match_found',
  gameId: string,
  opponentId: string,
  opponentName: string,
  opponentAvatarKey: string,
  read: boolean,
  createdAt: timestamp
}
```

### Frontend

#### Components

1. **`MatchmakingCard`** (`src/components/MatchmakingCard.js`)
    - Displays the matchmaking UI on the home screen
    - Shows queue count and searching status
    - Handles start/stop searching actions
    - Provides visual feedback during searching state

#### Hooks

1. **`useMatchmaking`** (`src/hooks/useMatchmaking.js`)
    - Manages matchmaking state and real-time updates
    - Listens to queue changes for live player count
    - Listens to user's queue entry for status updates
    - Listens for match found notifications
    - Provides `startSearching` and `stopSearching` functions

#### Integration

The matchmaking feature is integrated into the Home screen (`src/screens/Home.js`):

```javascript
const { searching, queueCount, loading, startSearching, stopSearching } = useMatchmaking({
    onMatchFound: handleMatchFound,
});
```

When a match is found, the `onMatchFound` callback is triggered, which navigates the user to the game screen.

## Firestore Security Rules

```
match /matchmakingQueue/{userId} {
  allow read: if isOwner(userId);
  allow list: if isAuthenticated();
  allow write: if false; // Only Cloud Functions can write
}
```

## User Flow

1. **Joining Queue**
    - User taps on "Find Random Match" card
    - Frontend calls `startSearching()`
    - Backend adds user to `matchmakingQueue` collection
    - Real-time listener updates the UI to show "Searching..." state
    - Queue count is displayed to user

2. **Waiting for Match**
    - User sees live updates of how many players are online
    - Can cancel search at any time by tapping the card again
    - Card displays animated searching state

3. **Match Found**
    - When another player joins, Firestore trigger attempts to match them
    - Both players are marked as "matched"
    - A new game is created with status "active"
    - Notifications are sent to both players
    - Both players are removed from the queue
    - Frontend receives notification and navigates to game screen

4. **Game Starts**
    - Game is immediately active (no invitation/acceptance needed)
    - Colors are randomly assigned
    - Game proceeds like any other PvP game

## Key Features

- **Real-time Updates**: Queue count updates instantly as players join/leave
- **Automatic Matching**: No manual pairing needed - first-come-first-served
- **Clean State Management**: Stale entries are automatically cleaned up
- **No Active Game Restriction**: Users can only join queue if they don't have active games
- **Instant Start**: Games start immediately upon matching

## Configuration

No configuration needed! The system works out of the box once deployed.

## Testing

To test the matchmaking system:

1. Open the app on two different devices/accounts
2. Both users tap "Find Random Match"
3. They should be matched almost instantly
4. Both should navigate to the game screen
5. Game should be ready to play

## Future Enhancements

Possible improvements:

1. **Skill-based Matchmaking**: Match players based on rating/skill level
2. **Preferred Time Controls**: Allow players to specify time control preferences
3. **Matchmaking Preferences**: Allow players to filter by criteria
4. **Queue Regions**: Support regional matchmaking for better latency
5. **Queue Statistics**: Show average wait time, peak hours, etc.
6. **Animated Searching State**: Add smooth rotation animation to search icon
