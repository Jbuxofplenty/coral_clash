import { CloudTasksClient } from '@google-cloud/tasks';
import { onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { admin } from '../init.js';
import { isComputerUser } from '../utils/computerUsers.js';
import { getFunctionRegion } from '../utils/appCheckConfig.js';
import { increment, serverTimestamp } from '../utils/helpers.js';
import { makeComputerMoveHelper } from '../routes/game.js';

/**
 * Cancel pending timeout task for a game
 */
async function cancelPendingTimeoutTask(gameId, taskName) {
    // Skip in emulator
    if (process.env.FUNCTIONS_EMULATOR === 'true' || !taskName) {
        return;
    }

    try {
        const db = admin.firestore();
        const client = new CloudTasksClient();

        await client.deleteTask({ name: taskName });
        console.log(`Cancelled timeout task for game ${gameId}`);

        // Clear the task name from Firestore
        await db.collection('games').doc(gameId).update({
            pendingTimeoutTask: null,
        });
    } catch (error) {
        // Task might already be executed or not exist, which is fine
        console.log(`Could not cancel task for game ${gameId}:`, error.message);
    }
}

/**
 * Check if current player's time has expired and end game if so
 */
async function checkAndHandleTimeExpiration(gameId, gameData) {
    const db = admin.firestore();

    // Only check if game has time control and is active
    if (
        !gameData.timeControl?.totalSeconds ||
        !gameData.timeRemaining ||
        !gameData.lastMoveTime ||
        gameData.status !== 'active' ||
        !gameData.currentTurn
    ) {
        return { timeExpired: false };
    }

    const now = Date.now();
    const lastMoveTimestamp = gameData.lastMoveTime.toDate
        ? gameData.lastMoveTime.toDate().getTime()
        : gameData.lastMoveTime;
    const elapsedSeconds = Math.floor((now - lastMoveTimestamp) / 1000);

    // Check current player's time
    const currentPlayerTime =
        gameData.timeRemaining[gameData.currentTurn] || gameData.timeControl.totalSeconds;
    const newTimeRemaining = currentPlayerTime - elapsedSeconds;

    if (newTimeRemaining <= 0) {
        // Time has expired - end the game
        const loser = gameData.currentTurn;
        const winner = loser === gameData.creatorId ? gameData.opponentId : gameData.creatorId;

        // Cancel pending timeout task (the current one that triggered this)
        if (gameData.pendingTimeoutTask) {
            await cancelPendingTimeoutTask(gameId, gameData.pendingTimeoutTask);
        }

        // Update game to completed
        await db
            .collection('games')
            .doc(gameId)
            .update({
                status: 'completed',
                result: loser === gameData.creatorId ? 'loss' : 'win',
                resultReason: 'timeout',
                winner: winner,
                timeRemaining: {
                    ...gameData.timeRemaining,
                    [loser]: 0,
                },
                pendingTimeoutTask: null,
                updatedAt: serverTimestamp(),
            });

        // Update stats if not a computer game (check both 'computer' and computer user IDs)
        const isComputerGame = gameData.opponentId === 'computer' || gameData.opponentType === 'computer';
        if (!isComputerGame) {
            // Winner gets a win
            await db
                .collection('users')
                .doc(winner)
                .update({
                    'stats.gamesPlayed': increment(1),
                    'stats.gamesWon': increment(1),
                });

            // Loser gets a loss
            await db
                .collection('users')
                .doc(loser)
                .update({
                    'stats.gamesPlayed': increment(1),
                    'stats.gamesLost': increment(1),
                });

            // Notify both players
            await db.collection('notifications').add({
                userId: winner,
                type: 'game_over',
                gameId: gameId,
                result: 'win',
                reason: 'timeout',
                read: false,
                createdAt: serverTimestamp(),
            });

            await db.collection('notifications').add({
                userId: loser,
                type: 'game_over',
                gameId: gameId,
                result: 'loss',
                reason: 'timeout',
                read: false,
                createdAt: serverTimestamp(),
            });
        } else {
            // Computer game - only update user stats
            // Check if winner is computer (could be 'computer' or computer user ID)
            const computerId = gameData.opponentId;
            const isUserWinner = winner !== computerId && winner !== 'computer';
            await db
                .collection('users')
                .doc(gameData.creatorId)
                .update({
                    'stats.gamesPlayed': increment(1),
                    'stats.gamesWon': increment(isUserWinner ? 1 : 0),
                    'stats.gamesLost': increment(isUserWinner ? 0 : 1),
                });
        }

        return { timeExpired: true, winner, loser };
    }

    return { timeExpired: false };
}

/**
 * Firestore trigger: Schedule time expiration check when lastMoveTime is updated
 * This ensures we check for timeout at the exact moment time runs out
 */
export const onGameMoveUpdate = onDocumentUpdated(
    {
        document: 'games/{gameId}',
        region: getFunctionRegion(), // Match Firestore region for lower latency
    },
    async (event) => {
    try {
        const db = admin.firestore();
        const change = event.data;
        if (!change) return;

        const gameId = event.params.gameId;
        const beforeData = change.before.data();
        const afterData = change.after.data();

        // Check if lastMoveTime actually changed (a move was made)
        // This check must happen FIRST to prevent computer moves from triggering on unrelated updates
        const beforeTime = beforeData.lastMoveTime?.toDate?.()?.getTime() || 0;
        const afterTime = afterData.lastMoveTime?.toDate?.()?.getTime() || 0;
        const lastMoveTimeChanged = beforeTime !== afterTime;

        // Only proceed with time control scheduling if game has time control
        if (
            !afterData.lastMoveTime ||
            !afterData.timeControl?.totalSeconds ||
            !afterData.timeRemaining ||
            !afterData.currentTurn ||
            afterData.status !== 'active'
        ) {
            // Even if time control isn't enabled, check for computer moves if lastMoveTime changed
            if (lastMoveTimeChanged) {
                const currentTurn = afterData.currentTurn;
                if (
                    currentTurn &&
                    isComputerUser(currentTurn) &&
                    afterData.opponentType === 'computer' &&
                    afterData.status === 'active'
                ) {
                    console.log(`[onGameMoveUpdate] Computer user ${currentTurn} turn detected, making move automatically`);
                    try {
                        // Make computer move asynchronously (don't await to avoid blocking)
                        makeComputerMoveHelper(gameId, afterData).catch((error) => {
                            console.error(`[onGameMoveUpdate] Error making computer move for ${currentTurn}:`, error);
                        });
                    } catch (error) {
                        console.error(`[onGameMoveUpdate] Error triggering computer move for ${currentTurn}:`, error);
                    }
                }
            }
            return null;
        }

        // If lastMoveTime didn't change, this update is not related to a move (e.g., just pendingTimeoutTask update)
        // Skip computer move check and timeout scheduling
        if (!lastMoveTimeChanged) {
            return null;
        }

        // Check if it's a computer user's turn - only check when a move was actually made
        const currentTurn = afterData.currentTurn;
        if (
            currentTurn &&
            isComputerUser(currentTurn) &&
            afterData.opponentType === 'computer' &&
            afterData.status === 'active'
        ) {
            console.log(`[onGameMoveUpdate] Computer user ${currentTurn} turn detected, making move automatically`);
            try {
                // Make computer move asynchronously (don't await to avoid blocking)
                makeComputerMoveHelper(gameId, afterData).catch((error) => {
                    console.error(`[onGameMoveUpdate] Error making computer move for ${currentTurn}:`, error);
                });
            } catch (error) {
                console.error(`[onGameMoveUpdate] Error triggering computer move for ${currentTurn}:`, error);
            }
        }

        // If pendingTimeoutTask is already set, makeMove already created it - skip to avoid duplicate updates
        // This prevents the trigger from updating the game document unnecessarily, which would cause
        // the trigger to fire again and potentially send duplicate notifications
        if (afterData.pendingTimeoutTask) {
            console.log(
                `[onGameMoveUpdate] Timeout task already exists for game ${gameId}, skipping creation`,
            );
            return null;
        }

        // Calculate when current player's time will expire
        const currentPlayerTime = afterData.timeRemaining[afterData.currentTurn];

        if (!currentPlayerTime || currentPlayerTime <= 0) {
            // Time already expired, handle immediately
            await checkAndHandleTimeExpiration(gameId, afterData);
            return null;
        }

        // Skip Cloud Tasks scheduling in emulator (no local emulator available)
        if (process.env.FUNCTIONS_EMULATOR === 'true') {
            console.log(
                `[Emulator] Skipping Cloud Task scheduling for game ${gameId} - would expire in ${currentPlayerTime}s`,
            );
            return null;
        }

        // Schedule a task to check expiration at the exact time
        // NOTE: This should rarely execute since makeMove already creates the task
        // This is a fallback for edge cases where makeMove didn't create the task
        const client = new CloudTasksClient();

        const project = process.env.GCLOUD_PROJECT || process.env.GCP_PROJECT;
        const location = process.env.FUNCTION_REGION || 'us-central1';
        const queue = 'default';

        const parent = client.queuePath(project, location, queue);

        // Calculate schedule time (current time + remaining time)
        const scheduleTime = new Date(afterTime + currentPlayerTime * 1000);

        // Create the task
        // Generate unique task name
        const taskName = `${parent}/tasks/timeout-${gameId}-${afterTime}`;

        const task = {
            name: taskName,
            httpRequest: {
                httpMethod: 'POST',
                url: `https://${location}-${project}.cloudfunctions.net/handleTimeExpiration`,
                body: Buffer.from(JSON.stringify({ gameId })).toString('base64'),
                headers: {
                    'Content-Type': 'application/json',
                },
            },
            scheduleTime: {
                seconds: Math.floor(scheduleTime.getTime() / 1000),
            },
        };

        const [response] = await client.createTask({ parent, task });

        // Store task name in Firestore for cancellation
        await db.collection('games').doc(gameId).update({
            pendingTimeoutTask: response.name,
        });

        console.log(
            `Scheduled time expiration check for game ${gameId} at ${scheduleTime.toISOString()}`,
        );
        return null;
    } catch (error) {
        console.error('Error in onGameMoveUpdate trigger:', error);
        // Don't throw - we don't want to fail the move because of scheduling issues
        return null;
    }
    },
);
