# Game Timeout Cloud Tasks System

## Overview

The game timeout system uses Google Cloud Tasks to automatically end games when a player's time runs out. When a move is made, the system:

1. **Cancels** the old timeout task (if any)
2. **Creates** a new timeout task scheduled to execute when the next player's time expires
3. **Stores** the task name in Firestore (`pendingTimeoutTask` field)

This ensures accurate timeout enforcement without requiring constant polling.

## Architecture

### Core Components

1. **`createTimeoutTask(gameId, timeRemainingSeconds)`** - Creates a Cloud Task
2. **`cancelPendingTimeoutTask(gameId, taskName)`** - Cancels an existing Cloud Task
3. **`handleTimeExpiration`** - HTTP endpoint called by Cloud Tasks when time expires
4. **`checkAndHandleTimeExpiration(gameId, gameData)`** - Verifies and processes timeout

### Cloud Task Queue

- **Queue Name**: `game-timeouts`
- **Location**: `us-central1` (or `FUNCTION_REGION` env var)
- **Execution**: HTTP POST to `handleTimeExpiration` endpoint
- **Authentication**: Uses OIDC token with service account

## Task Lifecycle - Where Tasks Are Created

Tasks are created in **6 scenarios**:

### 1. Game Invitation Accepted (`respondToGameInvite`)

```javascript
// When a PvP game is accepted and time control is enabled
if (accept && gameData.timeControl && gameData.timeControl.totalSeconds) {
  const taskName = await createTimeoutTask(gameId, firstPlayerTime);
  updateData.pendingTimeoutTask = taskName;
}
```

### 2. Computer Game Created (`createComputerGame`)

```javascript
// When starting a computer game with time control
if (finalTimeControl.totalSeconds && timeRemaining) {
  const taskName = await createTimeoutTask(gameRef.id, timeRemaining[userId]);
  await gameRef.update({ pendingTimeoutTask: taskName });
}
```

### 3. Move Made (`makeMove`)

```javascript
// After every move in a timed game
if (!gameResult.isOver && nextTurn && gameData.timeControl?.totalSeconds) {
  const nextPlayerTime = updatedTimeRemaining[nextTurn];
  const taskName = await createTimeoutTask(gameId, nextPlayerTime);
  updateData.pendingTimeoutTask = taskName;
}
```

### 4. Undo Request (Computer Game) (`requestUndo`)

```javascript
// After undo in computer game with time control
if (gameData.timeControl?.totalSeconds && gameData.timeRemaining) {
  const nextPlayerTime = gameData.timeRemaining[nextTurn];
  const taskName = await createTimeoutTask(gameId, nextPlayerTime);
  updateData.pendingTimeoutTask = taskName;
}
```

### 5. Undo Approved (PvP Game) (`respondToUndoRequest`)

```javascript
// After undo is approved in PvP game with time control
if (gameData.timeControl?.totalSeconds && gameData.timeRemaining) {
  const nextPlayerTime = gameData.timeRemaining[nextTurn];
  const taskName = await createTimeoutTask(gameId, nextPlayerTime);
  updateData.pendingTimeoutTask = taskName;
}
```

### 6. Game Reset (Computer & PvP) (`requestGameReset` & `respondToResetRequest`)

```javascript
// After game reset with time control
if (gameData.timeControl?.totalSeconds && gameData.timeRemaining) {
  const playerTime = gameData.timeRemaining[gameData.creatorId];
  const taskName = await createTimeoutTask(gameId, playerTime);
  updateData.pendingTimeoutTask = taskName;
}
```

## Task Cleanup - Where Tasks Are Cancelled

Tasks are **always cancelled** before creating new ones to prevent zombie tasks:

### Automatic Cleanup Scenarios

| Scenario           | Function                                    | Why                                      |
| ------------------ | ------------------------------------------- | ---------------------------------------- |
| **Game Over**      | `makeMove`                                  | No more timeouts needed                  |
| **Player Resigns** | `resignGame`                                | Game ends immediately                    |
| **New Move Made**  | `makeMove`                                  | Replace with new timeout for next player |
| **Undo Performed** | `requestUndo`, `respondToUndoRequest`       | Recalculate timeout for current position |
| **Game Reset**     | `requestGameReset`, `respondToResetRequest` | Start fresh with new timeout             |
| **Time Expired**   | `checkAndHandleTimeExpiration`              | Task executed, clear reference           |

### Pattern

Every location that creates a task follows this pattern:

```javascript
// 1. Cancel old task
if (gameData.pendingTimeoutTask) {
  await cancelPendingTimeoutTask(gameId, gameData.pendingTimeoutTask);
}

// 2. Create new task (if needed)
if (shouldCreateTimeout) {
  const taskName = await createTimeoutTask(gameId, timeRemaining);
  updateData.pendingTimeoutTask = taskName;
} else {
  updateData.pendingTimeoutTask = null; // Clear reference
}

// 3. Update Firestore
await db.collection('games').doc(gameId).update(updateData);
```

## Zombie Task Prevention

### Design Principles

1. **Always cancel before create** - Never create a new task without canceling the old one
2. **Store task name in Firestore** - `pendingTimeoutTask` field tracks current task
3. **Idempotent cancellation** - `cancelPendingTimeoutTask` gracefully handles missing tasks
4. **Clear on completion** - Set `pendingTimeoutTask: null` when game ends
5. **Skip in emulator** - Tasks aren't created in local development

### Edge Cases Handled

✅ **Multiple moves before task executes** - Old task cancelled, new task created  
✅ **Game ends before timeout** - Task cancelled on resignation/checkmate  
✅ **Undo after moves** - Old task cancelled, recalculated task created  
✅ **Reset during active game** - Old task cancelled, new task for reset position  
✅ **Task executes successfully** - `pendingTimeoutTask` cleared after timeout processed  
✅ **Emulator mode** - No tasks created (returns null)

## Setup Instructions

### 1. Create Cloud Tasks Queue

```bash
gcloud tasks queues create game-timeouts \
    --location=us-central1 \
    --max-attempts=3 \
    --max-retry-duration=1h
```

### 2. Grant Permissions

The Cloud Tasks service needs permission to invoke your function:

```bash
# Get your project ID
PROJECT_ID=$(gcloud config get-value project)

# Grant invoker role to Cloud Tasks service account
gcloud functions add-iam-policy-binding handleTimeExpiration \
    --region=us-central1 \
    --member=serviceAccount:${PROJECT_ID}@appspot.gserviceaccount.com \
    --role=roles/cloudfunctions.invoker
```

### 3. Environment Variables

Ensure these are set in your Firebase Functions config:

```bash
GCLOUD_PROJECT=your-project-id
FUNCTION_REGION=us-central1
```

### 4. Deploy Functions

```bash
cd functions
npm run deploy
# or
firebase deploy --only functions:handleTimeExpiration,functions:makeMove
```

## Monitoring

### Check for Zombie Tasks

```bash
# List all tasks in the queue
gcloud tasks list --queue=game-timeouts --location=us-central1

# If you find zombie tasks, drain the queue
gcloud tasks queues purge game-timeouts --location=us-central1
```

### Firestore Query for Games with Pending Tasks

```javascript
// Find all games with pending timeout tasks
const gamesWithTasks = await db.collection('games').where('pendingTimeoutTask', '!=', null).get();

console.log(`Found ${gamesWithTasks.size} games with pending tasks`);
```

### Logs to Monitor

- `Created timeout task for game {gameId}` - Task created successfully
- `Cancelled timeout task for game {gameId}` - Task cancelled successfully
- `Could not cancel task for game {gameId}` - Task already executed or doesn't exist (safe)
- `[Emulator] Skipping timeout task creation` - Running in local emulator

## Testing

### Local Development

Tasks are **automatically skipped** in the emulator:

```javascript
if (process.env.FUNCTIONS_EMULATOR === 'true') {
  console.log(`[Emulator] Skipping timeout task creation for game ${gameId}`);
  return null;
}
```

To test timeout logic locally:

1. Use `checkGameTime` callable function to manually trigger timeout check
2. Mock time expiration by setting `lastMoveTime` to an old timestamp
3. Call `handleTimeExpiration` HTTP endpoint directly with gameId

### Production Testing

1. Create a game with short time control (e.g., 10 seconds)
2. Make a move and wait
3. Verify timeout task executes and game ends
4. Check Firestore that `pendingTimeoutTask` is cleared

## Troubleshooting

### Zombie Tasks Found

If you discover zombie tasks:

1. **Check Firestore** - Do these games still exist and have `pendingTimeoutTask` set?
2. **Purge queue** - `gcloud tasks queues purge game-timeouts`
3. **Review recent deploys** - Were functions deployed mid-game?
4. **Check logs** - Look for failed cancellation attempts

### Tasks Not Being Created

1. **Verify queue exists** - `gcloud tasks queues describe game-timeouts --location=us-central1`
2. **Check permissions** - Service account needs `cloudfunctions.invoker` role
3. **Review logs** - Look for "Error creating timeout task" messages
4. **Verify time control** - Game must have `timeControl.totalSeconds` set

### Tasks Not Executing

1. **Check task queue** - Are tasks stuck in queue?
2. **Verify function URL** - Should be `https://{region}-{project}.cloudfunctions.net/handleTimeExpiration`
3. **Check OIDC token** - Service account email should be `{project}@appspot.gserviceaccount.com`
4. **Review function logs** - Look for authentication or execution errors

## Cost Considerations

- **Cloud Tasks pricing**: ~$0.40 per million operations
- **Function invocations**: Each timeout triggers one function call
- **Firestore reads**: Each timeout check reads one game document
- **Firestore writes**: Each timeout writes to game document and notifications

**Estimated cost**: ~$0.01 per 1000 timed games (negligible)

## Future Enhancements

Potential improvements to the system:

- [ ] Batch timeout checking for multiple games
- [ ] Warning notifications before timeout (e.g., "30 seconds remaining")
- [ ] Grace period before timeout (e.g., 5 second buffer)
- [ ] Automatic time increment after moves (Fischer time control)
- [ ] Pause/resume functionality for timeouts

## Summary

The Cloud Tasks system ensures accurate game timeouts by:

1. ✅ Creating tasks when time control starts or changes
2. ✅ Cancelling old tasks before creating new ones
3. ✅ Storing task references in Firestore
4. ✅ Clearing references when games end
5. ✅ Handling all edge cases (undo, reset, resign)
6. ✅ Skipping in local development

**Zero zombie tasks** are possible when following the established patterns.
