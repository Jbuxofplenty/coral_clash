import { onSchedule } from 'firebase-functions/v2/scheduler';
import { admin } from '../init.js';
import { getFunctionRegion } from '../utils/appCheckConfig.js';
import { updateEloOnGameComplete } from '../utils/updateEloOnGameComplete.js';
import { serverTimestamp } from '../utils/helpers.js';

const db = admin.firestore();

/**
 * Scheduled function: Auto-resign active PvP games with no moves in 30 days
 * Runs daily
 */
export const autoResignStaleGames = onSchedule(
    {
        schedule: 'every 24 hours',
        region: getFunctionRegion(),
    },
    async (_event) => {
        try {
            const thirtyDaysAgo = admin.firestore.Timestamp.fromDate(
                new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
            );

            // Query active games that haven't had a move in 30 days
            const staleGamesSnapshot = await db.collection('games')
                .where('status', '==', 'active')
                .where('lastMoveTime', '<', thirtyDaysAgo)
                .limit(100) // Process in batches
                .get();

            if (staleGamesSnapshot.empty) {
                console.log('[AutoResign] No stale games found');
                return null;
            }

            console.log(`[AutoResign] Found ${staleGamesSnapshot.size} stale games to auto-resign`);

            for (const gameDoc of staleGamesSnapshot.docs) {
                const gameData = gameDoc.data();
                const gameId = gameDoc.id;

                // Determine who to resign (the player whose turn it is)
                const loserId = gameData.currentTurn;
                if (!loserId || loserId === 'computer') {
                    console.log(`[AutoResign] Skipping game ${gameId}: no human turn or computer turn`);
                    continue;
                }

                const winnerId = loserId === gameData.creatorId ? gameData.opponentId : gameData.creatorId;
                const loserColor = gameData.whitePlayerId === loserId ? 'w' : 'b';

                console.log(`[AutoResign] Resigning ${loserId} in game ${gameId}`);

                // 1. Update game status
                const currentGameState = gameData.gameState || {};
                const updatedGameState = {
                    ...currentGameState,
                    resigned: loserColor,
                    autoResigned: true // Mark as system auto-resigned
                };

                await db.collection('games').doc(gameId).update({
                    status: 'completed',
                    result: loserId === gameData.creatorId ? 'opponent_wins' : 'creator_wins',
                    resultReason: 'inactivity',
                    winner: winnerId,
                    gameState: updatedGameState,
                    updatedAt: serverTimestamp(),
                    completedAt: serverTimestamp()
                });

                // 2. Distribute Elo
                await updateEloOnGameComplete(gameId, { ...gameData, status: 'completed' }, winnerId);

                // 3. Send notifications
                await db.collection('notifications').add({
                    userId: winnerId,
                    type: 'game_result',
                    gameId: gameId,
                    result: 'win',
                    reason: 'inactivity',
                    read: false,
                    createdAt: serverTimestamp(),
                });

                await db.collection('notifications').add({
                    userId: loserId,
                    type: 'game_result',
                    gameId: gameId,
                    result: 'loss',
                    reason: 'inactivity',
                    read: false,
                    createdAt: serverTimestamp(),
                });
            }

            return null;
        } catch (error) {
            console.error('Error in autoResignStaleGames:', error);
            return null;
        }
    }
);
