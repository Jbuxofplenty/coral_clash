import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { admin } from '../init.js';
import { getAppCheckConfig } from '../utils/appCheckConfig.js';
import { DEFAULT_ELO } from '../utils/eloRating.js';

const db = admin.firestore();

/**
 * Get Ranked Neighborhood (5 players above, 5 players below)
 */
export const getLeaderboard = onCall({ ...getAppCheckConfig(), minInstances: 1 }, async (request) => {
    try {
        const { auth } = request;
        if (!auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = auth.uid;

        // Get current user profile
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            throw new HttpsError('not-found', 'User profile not found');
        }

        const userData = userDoc.data();
        const userElo = userData.stats?.elo || DEFAULT_ELO;

        // 1. Query players ABOVE or equal (includes user)
        const aboveQuery = db.collection('users')
            .where('stats.elo', '>=', userElo)
            .orderBy('stats.elo', 'asc')
            .limit(6);

        // 2. Query players BELOW
        const belowQuery = db.collection('users')
            .where('stats.elo', '<', userElo)
            .orderBy('stats.elo', 'desc')
            .limit(5);

        // 3. Get absolute rank
        const rankQuery = db.collection('users')
            .where('stats.elo', '>', userElo);
        
        const [aboveSnapshot, belowSnapshot, rankSnapshot] = await Promise.all([
            aboveQuery.get(),
            belowQuery.get(),
            rankQuery.count().get()
        ]);

        const userRank = rankSnapshot.data().count + 1;

        // Process snapshots
        const aboveUsers = aboveSnapshot.docs.map(doc => ({
            id: doc.id,
            ...formatPublicUserInfo(doc.data(), doc.id === userId),
            isCurrentUser: doc.id === userId
        }));

        const belowUsers = belowSnapshot.docs.map(doc => ({
            id: doc.id,
            ...formatPublicUserInfo(doc.data(), false),
            isCurrentUser: false
        }));

        // Combine and sort DESC
        // Note: aboveUsers are in ASC order (closest to user first)
        // belowUsers are in DESC order (closest to user first)
        const neighborhood = [
            ...aboveUsers,
            ...belowUsers
        ].sort((a, b) => (b.elo || 0) - (a.elo || 0));

        // Assign ranks to neighborhood users
        // Since they are sorted DESC, we can calculate their ranks relative to userRank
        const userIndex = neighborhood.findIndex(u => u.id === userId);
        
        const rankedNeighborhood = neighborhood.map((u, index) => ({
            ...u,
            rank: userRank + (index - userIndex)
        }));

        return {
            success: true,
            neighborhood: rankedNeighborhood,
            userRank,
            userElo
        };
    } catch (error) {
        console.error('Error getting leaderboard:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Format user data for public display
 */
function formatPublicUserInfo(userData, isCurrentUser) {
    return {
        displayName: userData.displayName || 'User',
        discriminator: userData.discriminator || '',
        avatarKey: userData.settings?.avatarKey || 'dolphin',
        elo: userData.stats?.elo || DEFAULT_ELO,
        ratedGamesPlayed: userData.stats?.ratedGamesPlayed || 0
    };
}
