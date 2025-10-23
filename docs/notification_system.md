# Notification System Documentation

## Overview

The notification system has been refactored to be generic and extensible, supporting multiple notification types including friend requests, game requests, moves, and game events.

## Architecture

### Components

#### 1. NotificationDropdown (Generic Component)

Location: `src/components/NotificationDropdown.js`

**Features:**

- Generic, reusable notification dropdown that appears at the top of the screen
- Auto-dismisses after 5 seconds
- Configurable based on notification type
- Supports both action-based notifications (accept/decline) and tap-to-navigate notifications
- Smooth slide-in/out animations

**Supported Notification Types:**

- `friend_request` - Shows accept/decline actions
- `game_request` - Shows accept/decline actions
- `game_accepted` - Tap to navigate to game
- `move_made` - Tap to navigate to game for your turn
- `game_over` - Tap to view game results
- `friend_accepted` - Tap to navigate to Friends screen
- `undo_requested` - Alert when opponent requests to undo moves
- `undo_approved` - Alert when opponent approves undo request
- `undo_rejected` - Alert when opponent rejects undo request
- `undo_cancelled` - Alert when opponent cancels their undo request
- `reset_requested` - Alert when opponent requests to reset the game
- `reset_approved` - Alert when opponent approves reset request
- `reset_rejected` - Alert when opponent rejects reset request
- `reset_cancelled` - Alert when opponent cancels their reset request

**Props:**

```javascript
{
  notification: {
    displayName: string,    // Display name to show
    avatarKey: string,      // Avatar key for display
    data: {
      type: string,         // Notification type
      ...                   // Additional type-specific data
    }
  },
  onAccept: function,       // Optional: Callback for accept action
  onDecline: function,      // Optional: Callback for decline action
  onDismiss: function,      // Callback when notification is dismissed
  onTap: function          // Optional: Callback when notification body is tapped
}
```

### Hooks

#### 2. usePvPGame Hook

Location: `src/hooks/usePvPGame.js`

**Purpose:** Centralized game management with state handling and error management.

**API:**

```javascript
const {
    // State
    loading,
    activeGames,

    // Actions
    sendGameRequest, // Send game request to friend
    acceptGameInvite, // Accept incoming game invitation
    declineGameInvite, // Decline incoming game invitation
    loadActiveGames, // Load user's active games

    // Computed
    getPendingInvites, // Get pending game invitations
    getActiveGamesList, // Get active games
    hasPendingInvites, // Boolean: has pending invites
    hasActiveGames, // Boolean: has active games
} = usePvPGame();
```

**Example Usage:**

```javascript
const { sendGameRequest } = usePvPGame();

const handleStartGame = async (friendId, friendName) => {
    await sendGameRequest(friendId, friendName);
    // Shows alert automatically
};
```

### Backend Functions

#### 3. Game Request Notifications

Location: `functions/utils/notifications.js`

**Notification Functions:**

**Game Requests:**

- `sendGameRequestNotification(recipientId, senderId, senderName, gameId, avatarKey)` - Sends push notification when a game request is created
- `sendGameAcceptedNotification(recipientId, accepterId, accepterName, gameId)` - Sends push notification when a game request is accepted

**Undo Requests:**

- `sendUndoRequestNotification(recipientId, senderId, senderName, gameId, moveCount)` - Sends push notification when a player requests to undo moves
- `sendUndoApprovedNotification(recipientId, approverId, approverName, gameId, moveCount)` - Sends push notification when undo request is approved
- `sendUndoRejectedNotification(recipientId, rejecterId, rejecterName, gameId, moveCount)` - Sends push notification when undo request is rejected
- `sendUndoCancelledNotification(recipientId, cancellerId, cancellerName, gameId)` - Sends push notification when player cancels their own undo request

**Reset Requests:**

- `sendResetApprovedNotification(recipientId, approverId, approverName, gameId)` - Sends push notification when reset request is approved
- `sendResetRejectedNotification(recipientId, rejecterId, rejecterName, gameId)` - Sends push notification when reset request is rejected
- `sendResetCancelledNotification(recipientId, cancellerId, cancellerName, gameId)` - Sends push notification when player cancels their own reset request

#### 4. PvP Game Endpoints

Location: `functions/routes/game.js`

**Updated Endpoints:**

- `createPvPGame` - Now sends push notifications to opponent
- `respondToGameInvite` - Now sends notifications on acceptance

## Notification Flow

### Undo Request Flow

1. **Player A requests to undo their last move:**
    - Player A clicks the undo button during their opponent's turn
    - Confirms the undo request dialog

2. **Backend processes request:**
    - Sets `undoRequestedBy`, `undoRequestMoveCount`, and `undoRequestStatus: 'pending'` in game document
    - Sends push notification to Player B
    - Player B sees notification: "Player A wants to undo 1 move(s)"

3. **Player B can respond:**
    - **Accept:** Approves the undo
        - Backend undoes the move(s) and updates game state
        - Player A receives "Undo Approved" notification
    - **Deny:** Rejects the undo
        - Backend clears the undo request
        - Player A receives "Undo Rejected" notification
    - Player A can also cancel their own request
        - Backend clears the undo request
        - Player B receives "Request Cancelled" notification

### Reset Request Flow

1. **Player A requests to reset the game:**
    - Player A selects reset option from game menu
    - Confirms the reset request

2. **Backend processes request:**
    - Sets `resetRequestedBy` and `resetRequestStatus: 'pending'` in game document
    - For computer games: Auto-approves and resets immediately
    - For PvP games: Sends notification to Player B

3. **Player B can respond (PvP only):**
    - **Accept:** Approves the reset
        - Backend resets game to initial state
        - Player A receives "Reset Approved" notification
    - **Deny:** Rejects the reset
        - Backend clears the reset request
        - Player A receives "Reset Rejected" notification
    - Player A can also cancel their own request
        - Backend clears the reset request
        - Player B receives "Request Cancelled" notification

### Game Request Flow

1. **User A sends game request to User B:**

    ```javascript
    // In Friends screen
    await sendGameRequest(friendId, friendName);
    ```

2. **Backend creates game and sends notification:**
    - Creates game document with `status: 'pending'`
    - Creates notification document in Firestore
    - Sends push notification to User B

3. **User B receives notification:**
    - Notification dropdown appears
    - Shows accept/decline buttons
    - User can tap accept, decline, or dismiss

4. **User B accepts:**
    - Calls `respondToGameInvite(gameId, true)`
    - Updates game status to `active`
    - Sends acceptance notification to User A
    - Navigates to game screen

5. **User A receives acceptance:**
    - Notification dropdown appears (no actions)
    - User can tap to navigate to game

## Adding New Notification Types

To add a new notification type:

### 1. Add Configuration in NotificationDropdown.js

```javascript
const configs = {
    // ... existing types

    your_new_type: {
        title: 'Your Title',
        getMessage: (displayName, customData) => `Your custom message with ${displayName}`,
        icon: { name: 'icon-name', family: 'font-awesome' },
        showAvatar: true, // or false to show icon instead
        showActions: true, // or false for tap-only notifications
    },
};
```

### 2. Add Backend Notification Function

In `functions/utils/notifications.js`:

```javascript
async function sendYourNotification(recipientId, senderId, data) {
    return sendPushNotification(recipientId, {
        title: 'Your Title',
        body: 'Your message',
        data: {
            type: 'your_new_type',
            from: senderId,
            // ... additional data
        },
    });
}
```

### 3. Add Navigation Handling in App.js

```javascript
const handleNotificationTap = (notificationData) => {
    const notificationType = notificationData.data.type;

    if (navigationRef.current) {
        switch (notificationType) {
            // ... existing cases

            case 'your_new_type':
                navigationRef.current.navigate('YourScreen', {
                    // ... params
                });
                break;
        }
    }
};
```

## Testing

### Testing Friend Requests

1. Send friend request from User A to User B
2. User B should receive notification dropdown
3. User B accepts/declines
4. User A receives confirmation notification

### Testing Game Requests

1. User A clicks gamepad icon next to friend
2. User B receives game request notification with accept/decline
3. User B accepts → both users can navigate to game
4. User B declines → request cancelled

### Testing Move Notifications

1. User A makes a move
2. User B receives "Your Turn" notification
3. User B taps notification → navigates to game

### Testing Undo Request Notifications

1. User A requests undo during game
2. User B receives "Undo Request" notification
3. User B accepts → User A receives "Undo Approved" notification, game state reverts
4. OR User B denies → User A receives "Undo Rejected" notification
5. OR User A cancels → User B receives "Request Cancelled" notification

### Testing Reset Request Notifications

1. User A requests reset during game
2. User B receives notification (PvP only, computer games auto-approve)
3. User B accepts → User A receives "Reset Approved" notification, game resets
4. OR User B denies → User A receives "Reset Rejected" notification
5. OR User A cancels → User B receives "Request Cancelled" notification

## Future Enhancements

Potential improvements:

- Add notification history view
- Add notification preferences (mute certain types)
- Add sound/vibration customization
- Add notification grouping (multiple requests)
- Add in-app notification badge counts
- Add real-time game invites with countdown timer
