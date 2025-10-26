const { onSchedule } = require('firebase-functions/v2/scheduler');
const admin = require('firebase-admin');

const db = admin.firestore();

/**
 * Scheduled function: Clean up stale matchmaking entries
 * Remove entries older than 5 minutes
 */
exports.cleanupStaleMatchmakingEntries = onSchedule('every 10 minutes', async (event) => {
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

        console.log(`[Cleanup] Removing ${staleEntries.size} stale matchmaking entries`);

        const batch = db.batch();
        staleEntries.docs.forEach((doc) => {
            batch.delete(doc.ref);
        });
        await batch.commit();

        return null;
    } catch (error) {
        console.error('Error cleaning up stale matchmaking entries:', error);
        return null;
    }
});
