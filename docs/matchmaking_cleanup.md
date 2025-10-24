# Matchmaking Queue Cleanup System

## Overview

This document describes the multi-layered approach to ensure users are automatically removed from the matchmaking queue when they exit the app, go to background, or experience connectivity issues.

## Problem

Users could remain in the matchmaking queue when:

1. They force-close the app
2. The app crashes
3. The app goes to background
4. They lose network connectivity
5. They navigate away within the app

This leads to "ghost" entries in the queue, causing poor matchmaking experiences.

## Solution Architecture

We implemented a **defense-in-depth** approach with multiple cleanup mechanisms:

### 1. App State Monitoring (Primary Defense)

**Location:** `src/hooks/useMatchmaking.js`

Automatically removes users from the queue when the app goes to background or becomes inactive.

```javascript
// Monitor app state changes - leave queue when app goes to background
useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
        if (
            (nextAppState === 'background' || nextAppState === 'inactive') &&
            searchingRef.current
        ) {
            leaveMatchmaking().catch((error) => {
                console.error('[useMatchmaking] Error leaving queue on app background:', error);
            });
        }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription?.remove();
}, [leaveMatchmaking]);
```

**When it works:**

- User presses home button
- User switches to another app
- User locks their device

**Limitations:**

- Won't work if app is force-killed from app switcher
- Won't work if app crashes before event fires

### 2. Component Unmount Cleanup

**Location:** `src/screens/Home.js` (lines 98-109)

Removes users from queue when they navigate away from the Home screen.

```javascript
useEffect(() => {
    return () => {
        if (searchingRef.current) {
            stopSearching().catch((error) => {
                console.error('[Home] Error leaving matchmaking on unmount:', error);
            });
        }
    };
}, []);
```

**When it works:**

- User navigates to another screen
- App unmounts the Home component normally

**Limitations:**

- Won't work if app crashes
- Won't work if app is force-killed

### 3. Heartbeat System (Secondary Defense)

**Location:**

- Frontend: `src/hooks/useMatchmaking.js`
- Backend: `functions/routes/matchmaking.js`

A heartbeat is sent every 30 seconds while searching to prove the client is still alive.

#### Frontend Heartbeat

```javascript
// Send periodic heartbeat while searching (every 30 seconds)
useEffect(() => {
    if (!searching || !user || !user.uid) return;

    updateMatchmakingHeartbeat(); // Initial heartbeat

    const heartbeatInterval = setInterval(() => {
        if (searchingRef.current) {
            updateMatchmakingHeartbeat();
        }
    }, 30000); // 30 seconds

    return () => clearInterval(heartbeatInterval);
}, [searching, user, updateMatchmakingHeartbeat]);
```

#### Backend Heartbeat Handler

```javascript
exports.updateMatchmakingHeartbeat = functions.https.onCall(async (data, context) => {
    const userId = context.auth.uid;
    await db.collection('matchmakingQueue').doc(userId).update({
        lastHeartbeat: serverTimestamp(),
    });
    return { success: true };
});
```

**When it works:**

- Continuously updates while app is active and searching
- Proves client is still connected and alive

**Database Schema:**
Each matchmaking queue entry now includes:

```javascript
{
    userId: string,
    displayName: string,
    discriminator: string,
    avatarKey: string,
    timeControl: object,
    joinedAt: Timestamp,
    lastHeartbeat: Timestamp,  // NEW - Updated every 30 seconds
    status: 'searching' | 'matched'
}
```

### 4. Server-Side Cleanup (Final Defense)

**Location:** `functions/routes/matchmaking.js`

A scheduled Cloud Function runs every 2 minutes to remove entries with stale heartbeats.

```javascript
exports.cleanupStaleMatchmakingEntries = functions.pubsub
    .schedule('every 2 minutes')
    .onRun(async (context) => {
        const twoMinutesAgo = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 2 * 60 * 1000),
        );

        const staleEntries = await db
            .collection('matchmakingQueue')
            .where('lastHeartbeat', '<', twoMinutesAgo)
            .get();

        if (!staleEntries.empty) {
            const batch = db.batch();
            staleEntries.docs.forEach((doc) => batch.delete(doc.ref));
            await batch.commit();
        }

        return null;
    });
```

**When it works:**

- Catches any entries that slip through other mechanisms
- Handles force-closed apps, crashed apps, network failures
- Runs independently of client state

**Schedule:** Every 2 minutes
**Cleanup threshold:** Entries with lastHeartbeat older than 2 minutes

**Worst-case scenario:** A dead client will remain in queue for at most 2 minutes before being cleaned up.

## Timeline Example

Here's what happens when a user force-closes the app while searching:

```
00:00 - User joins matchmaking queue
        - Queue entry created with joinedAt and lastHeartbeat timestamps

00:30 - First heartbeat sent
        - lastHeartbeat updated to 00:30

01:00 - Second heartbeat sent
        - lastHeartbeat updated to 01:00

01:15 - User force-closes app
        - No cleanup occurs (app killed immediately)
        - No heartbeats are sent after this point

02:00 - Cleanup function runs
        - Checks for entries with lastHeartbeat < 00:00
        - User's entry still has lastHeartbeat of 01:00 (not old enough)

03:15 - User entry reaches 2 minutes old (01:00 + 2 min = 03:00)

04:00 - Cleanup function runs again
        - Finds user's entry with lastHeartbeat of 01:00
        - 01:00 < 02:00 (current time - 2 minutes)
        - Entry is deleted
```

**Total time in queue after force-close:** ~2 minutes 45 seconds maximum

## Testing the Implementation

### Test Case 1: Normal Navigation Away

1. Join matchmaking queue
2. Navigate to another screen (e.g., Settings)
3. **Expected:** Removed immediately via component unmount

### Test Case 2: Background the App

1. Join matchmaking queue
2. Press home button or switch to another app
3. **Expected:** Removed immediately via AppState listener

### Test Case 3: Force Close

1. Join matchmaking queue
2. Force-close app from app switcher
3. Wait 2-3 minutes
4. Check Firestore `matchmakingQueue` collection
5. **Expected:** Entry removed by cleanup function within ~2 minutes

### Test Case 4: Network Failure

1. Join matchmaking queue
2. Turn off device network (airplane mode)
3. Wait 2-3 minutes
4. **Expected:** Entry removed by cleanup function (no heartbeats received)

## Configuration

### Heartbeat Interval

**Current:** 30 seconds
**Location:** `src/hooks/useMatchmaking.js` line 177

To change the frequency:

```javascript
}, 30000); // Change this value (in milliseconds)
```

### Cleanup Schedule

**Current:** Every 2 minutes
**Location:** `functions/routes/matchmaking.js` line 344

To change the schedule:

```javascript
.schedule('every 2 minutes') // Change this value
```

### Cleanup Threshold

**Current:** 2 minutes
**Location:** `functions/routes/matchmaking.js` line 347

To change the threshold:

```javascript
new Date(Date.now() - 2 * 60 * 1000); // Change the 2 to desired minutes
```

### Recommended Settings

For optimal performance:

- **Heartbeat interval:** 30-60 seconds (balance between freshness and API calls)
- **Cleanup schedule:** 1-5 minutes (balance between responsiveness and cost)
- **Cleanup threshold:** 2-3 minutes (should be > heartbeat interval to avoid false positives)

**Formula:** `cleanup_threshold > heartbeat_interval * 2`

This ensures at least one missed heartbeat before cleanup occurs.

## Cost Considerations

### Heartbeat API Calls

- Each user searching = 1 call per 30 seconds
- 100 concurrent searchers = 200 calls/minute = 12,000 calls/hour
- Firebase Cloud Functions free tier: 2M calls/month
- Cost beyond free tier: $0.40 per million calls

### Cleanup Function

- Runs every 2 minutes regardless of queue size
- 720 invocations per day
- 21,600 invocations per month
- Well within free tier limits

## Monitoring

### Firestore Console

Monitor the `matchmakingQueue` collection:

- Check entry count over time
- Look for entries with old `lastHeartbeat` timestamps
- Verify cleanup function is running

### Cloud Functions Logs

Filter for:

- `[Cleanup] Removing X stale matchmaking entries` - successful cleanups
- `Error cleaning up stale matchmaking entries` - cleanup failures
- `Error updating matchmaking heartbeat` - heartbeat failures

### Metrics to Track

1. Average time in queue before match
2. Number of stale entries cleaned per run
3. Heartbeat success rate
4. Queue size over time

## Deployment

After making these changes, deploy the Cloud Functions:

```bash
firebase deploy --only functions
```

Specific functions updated:

- `joinMatchmaking` - Added lastHeartbeat field
- `updateMatchmakingHeartbeat` - New function
- `cleanupStaleMatchmakingEntries` - Modified schedule and query

The frontend changes will be deployed with your next app build.

## Future Improvements

### Optional Enhancements

1. **Presence Detection with Firebase Realtime Database**
    - More robust than heartbeats
    - Automatic disconnect detection
    - Requires additional setup

2. **Client-Side Heartbeat Monitoring**
    - Track failed heartbeats on client
    - Auto-leave queue after X failures
    - Better UX for network issues

3. **Exponential Backoff for Heartbeats**
    - Reduce frequency after initial period
    - Save on API calls for long searches

4. **Queue Position Indicator**
    - Show user their position in queue
    - Estimated wait time

## Troubleshooting

### Users not being removed

1. Check Cloud Functions logs for errors
2. Verify cleanup function is deployed and running
3. Check Firestore security rules allow cleanup

### Premature removals

1. Increase cleanup threshold
2. Decrease heartbeat interval
3. Check for network issues affecting heartbeats

### High API costs

1. Increase heartbeat interval
2. Increase cleanup schedule frequency
3. Consider caching or batching

## Summary

This implementation provides **four layers of defense** to ensure users are removed from the matchmaking queue:

1. ✅ **AppState monitoring** - Handles backgrounding (immediate)
2. ✅ **Component unmount** - Handles navigation (immediate)
3. ✅ **Heartbeat system** - Proves client is alive (30s intervals)
4. ✅ **Server cleanup** - Catches everything else (2min max)

**Result:** Users are guaranteed to be removed within 2-3 minutes in the absolute worst case scenario, with immediate removal in most normal cases.
