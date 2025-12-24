import { onSchedule } from 'firebase-functions/v2/scheduler';
import { admin } from '../init.js';
import { isComputerUser } from '../utils/computerUsers.js';
import { tryMatchPlayers } from '../triggers/onPlayerJoinQueue.js';

const db = admin.firestore();

/**
 * Scheduled function: Retry matching for users who have been waiting
 * Runs every 1 minute to check for users who have been waiting 10+ seconds
 * and attempts to match them with computer users if no real players are available
 * Note: Firebase Cloud Scheduler minimum interval is 1 minute
 */
export const retryMatchmaking = onSchedule('every 1 minutes', async (_event) => {
    try {
        const now = admin.firestore.Timestamp.now();

        // Find all users who are searching (we'll filter by wait time in memory)
        // Note: We query all searching users because Firestore queries require indexes for compound queries
        // and we need to filter by wait time which is calculated, not stored
        const waitingUsers = await db
            .collection('matchmakingQueue')
            .where('status', '==', 'searching')
            .limit(50) // Get more users to account for filtering
            .get();

        if (waitingUsers.empty) {
            return null;
        }

        // Filter to only real users (not computer users) who have been waiting 10+ seconds
        const eligibleUsers = waitingUsers.docs.filter((doc) => {
            if (isComputerUser(doc.id)) {
                return false; // Skip computer users
            }

            const userData = doc.data();
            const joinedAt = userData.joinedAt;

            if (!joinedAt) {
                console.warn(`[RetryMatchmaking] User ${doc.id} has no joinedAt timestamp`);
                return false; // Skip users without joinedAt timestamp
            }

            // Handle both Timestamp objects and plain objects with seconds property
            const joinedAtSeconds = joinedAt.seconds || (joinedAt.toMillis ? Math.floor(joinedAt.toMillis() / 1000) : null);
            if (joinedAtSeconds === null) {
                console.warn(`[RetryMatchmaking] Could not extract seconds from joinedAt for user ${doc.id}`);
                return false;
            }

            // Verify they've been waiting at least 10 seconds
            const waitTimeSeconds = now.seconds - joinedAtSeconds;
            return waitTimeSeconds >= 10;
        });

        if (eligibleUsers.length === 0) {
            return null;
        }

        // Try to match each eligible user
        // tryMatchPlayers will handle the logic of matching with computer users
        const matchPromises = eligibleUsers.map((doc) => tryMatchPlayers(doc.id));
        
        const results = await Promise.allSettled(matchPromises);
        const failures = results.filter((r) => r.status === 'rejected');
        if (failures.length > 0) {
            console.error(`[RetryMatchmaking] ${failures.length} matching attempts failed:`, failures);
        }

        return null;
    } catch (error) {
        console.error('Error retrying matchmaking:', error);
        return null;
    }
});

