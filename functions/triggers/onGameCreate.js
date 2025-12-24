import { onDocumentCreated } from 'firebase-functions/v2/firestore';
import { admin } from '../init.js';
import { isComputerUser } from '../utils/computerUsers.js';
import { makeComputerMoveHelper } from '../routes/game.js';
import { getFunctionRegion } from '../utils/appCheckConfig.js';

const db = admin.firestore();

/**
 * Firestore trigger: When a game is created, check if computer user should make first move
 * This handles the case where computer user is white (goes first)
 */
export const onGameCreate = onDocumentCreated(
    {
        document: 'games/{gameId}',
        region: getFunctionRegion(), // Match Firestore region for lower latency
    },
    async (event) => {
    try {
        const snap = event.data;
        if (!snap) return;

        const gameId = event.params.gameId;
        const gameData = snap.data();

        // Only handle computer games that are active
        if (gameData.opponentType !== 'computer' || gameData.status !== 'active') {
            return null;
        }

        const currentTurn = gameData.currentTurn;

        // Check if it's a computer user's turn (they're white and go first)
        if (currentTurn && isComputerUser(currentTurn)) {
            console.log(`[onGameCreate] Computer user ${currentTurn} is white, triggering first move for game ${gameId}`);
            // Small delay to ensure game document is fully written
            setTimeout(async () => {
                try {
                    // Fetch fresh game data to ensure we have the latest
                    const freshGameDoc = await db.collection('games').doc(gameId).get();
                    if (freshGameDoc.exists) {
                        const freshData = freshGameDoc.data();
                        // Double-check it's still the computer's turn and game is active
                        if (
                            freshData.currentTurn === currentTurn &&
                            freshData.status === 'active' &&
                            freshData.opponentType === 'computer'
                        ) {
                            await makeComputerMoveHelper(gameId, freshData);
                        } else {
                            console.log(
                                `[onGameCreate] Game ${gameId} state changed, skipping computer move`,
                            );
                        }
                    } else {
                        console.error(`[onGameCreate] Game ${gameId} not found when trying to make computer move`);
                    }
                } catch (error) {
                    console.error(`[onGameCreate] Error making computer move for ${currentTurn}:`, error);
                }
            }, 1000); // 1 second delay to ensure document is written
        }

        return null;
    } catch (error) {
        console.error('Error in onGameCreate trigger:', error);
        // Don't throw - we don't want to fail game creation
        return null;
    }
    },
);

