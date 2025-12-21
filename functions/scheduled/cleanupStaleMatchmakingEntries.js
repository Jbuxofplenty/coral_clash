import { onSchedule } from 'firebase-functions/v2/scheduler';
import { admin } from '../init.js';
import { isComputerUser } from '../utils/computerUsers.js';

const db = admin.firestore();

/**
 * Scheduled function: Clean up stale matchmaking entries
 * Remove entries older than 5 minutes
 */
export const cleanupStaleMatchmakingEntries = onSchedule('every 10 minutes', async (_event) => {
    try {
        const twoMinutesAgo = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 2 * 60 * 1000),
        );

        const staleEntries = await db
            .collection('matchmakingQueue')
            .where('lastHeartbeat', '<', twoMinutesAgo)
            .get();

        if (staleEntries.empty) {
            console.log('[Cleanup] No stale matchmaking entries found');
            return null;
        }

        // Filter out computer users - they should always stay in queue
        const realUserEntries = staleEntries.docs.filter((doc) => !isComputerUser(doc.id));

        if (realUserEntries.length === 0) {
            console.log('[Cleanup] No stale real user entries found (computer users excluded)');
            return null;
        }

        console.log(
            `[Cleanup] Removing ${realUserEntries.length} stale matchmaking entries (excluding ${staleEntries.size - realUserEntries.length} computer users)`,
        );

        const batch = db.batch();
        realUserEntries.forEach((doc) => {
            // Double-check: Never delete computer users (extra safety check)
            if (!isComputerUser(doc.id)) {
                batch.delete(doc.ref);
            } else {
                console.warn(
                    `[Cleanup] Skipping computer user ${doc.id} - should never be deleted`,
                );
            }
        });
        await batch.commit();

        return null;
    } catch (error) {
        console.error('Error cleaning up stale matchmaking entries:', error);
        return null;
    }
});
