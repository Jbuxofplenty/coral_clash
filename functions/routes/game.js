import { CloudTasksClient } from '@google-cloud/tasks';
import {
    CoralClash,
    GAME_VERSION,
    SEARCH_DEPTH,
    calculateUndoMoveCount,
    createGameSnapshot,
    findBestMoveIterativeDeepening,
    getTimeControlForDifficulty,
    restoreGameFromSnapshot,
} from '@jbuxofplenty/coral-clash';
import { HttpsError, onCall, onRequest } from 'firebase-functions/v2/https';
import { admin } from '../init.js';
import { getAppCheckConfig, getFunctionRegion } from '../utils/appCheckConfig.js';
import { getComputerUserData, isComputerUser } from '../utils/computerUsers.js';
import { getGameResult, validateMove } from '../utils/gameValidator.js';
import { validateClientVersion } from '../utils/gameVersion.js';
import {
    formatDisplayName,
    increment,
    initializeGameState,
    serverTimestamp,
} from '../utils/helpers.js';
import {
    sendGameAcceptedNotification,
    sendGameRequestNotification,
    sendOpponentMoveNotification,
    sendResetApprovedNotification,
    sendResetCancelledNotification,
    sendResetRejectedNotification,
    sendUndoApprovedNotification,
    sendUndoCancelledNotification,
    sendUndoRejectedNotification,
    sendUndoRequestNotification,
} from '../utils/notifications.js';

const db = admin.firestore();

/**
 * Validate game engine version
 * @param {string} clientVersion - Version from client
 * @returns {{isCompatible: boolean, requiresUpdate: boolean, serverVersion: string, clientVersion: string}}
 */
function validateGameVersion(clientVersion) {
    const validation = validateClientVersion(clientVersion);

    if (!validation.isCompatible) {
        console.warn(
            `Version mismatch - Client: ${clientVersion || 'unknown'}, Server: ${validation.serverVersion}`,
        );
    }

    return validation;
}

/**
 * Handler for creating a new PvP game
 * Separated for testing purposes
 */
async function createGameHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    const { opponentId, timeControl, clientVersion } = data;
    const creatorId = auth.uid;

    // Validate client version
    const versionCheck = clientVersion ? validateGameVersion(clientVersion) : null;

    // Validate opponent exists
    const opponentDoc = await db.collection('users').doc(opponentId).get();
    if (!opponentDoc.exists) {
        throw new HttpsError('not-found', 'Opponent not found');
    }

    // Check for existing pending games between these players
    // Check both directions: creator->opponent and opponent->creator
    const existingGamesQuery1 = await db
        .collection('games')
        .where('creatorId', '==', creatorId)
        .where('opponentId', '==', opponentId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

    const existingGamesQuery2 = await db
        .collection('games')
        .where('creatorId', '==', opponentId)
        .where('opponentId', '==', creatorId)
        .where('status', '==', 'pending')
        .limit(1)
        .get();

    if (!existingGamesQuery1.empty || !existingGamesQuery2.empty) {
        throw new HttpsError(
            'already-exists',
            'A pending game request already exists between these players',
        );
    }

    // Randomly assign white/black to players
    const randomizeColors = Math.random() < 0.5;
    const whitePlayerId = randomizeColors ? creatorId : opponentId;
    const blackPlayerId = randomizeColors ? opponentId : creatorId;

    // Get creator's info to snapshot
    const creatorDoc = await db.collection('users').doc(creatorId).get();
    const creatorData = creatorDoc.data();
    const creatorName = formatDisplayName(creatorData.displayName, creatorData.discriminator);

    // Get creator's avatar from settings
    const creatorSettingsDoc = await db
        .collection('users')
        .doc(creatorId)
        .collection('settings')
        .doc('preferences')
        .get();
    const creatorSettings = creatorSettingsDoc.exists ? creatorSettingsDoc.data() : {};

    // Get opponent's info to snapshot
    const opponentData = opponentDoc.data();
    const opponentName = formatDisplayName(opponentData.displayName, opponentData.discriminator);

    // Get opponent's avatar from settings
    const opponentSettingsDoc = await db
        .collection('users')
        .doc(opponentId)
        .collection('settings')
        .doc('preferences')
        .get();
    const opponentSettings = opponentSettingsDoc.exists ? opponentSettingsDoc.data() : {};

    // Check if opponent is a computer user - if so, auto-accept
    const isOpponentComputer = isComputerUser(opponentId);
    const opponentDifficulty = isOpponentComputer ? opponentData.difficulty : null;

    // Create game document with snapshot of player info
    const gameData = {
        creatorId,
        opponentId,
        whitePlayerId, // Randomly assigned
        blackPlayerId, // Randomly assigned
        status: isOpponentComputer ? 'active' : 'pending', // Auto-accept for computer users
        currentTurn: whitePlayerId, // White always starts
        timeControl: timeControl || { type: 'unlimited' },
        moves: [],
        gameState: initializeGameState(),
        version: GAME_VERSION, // Store game engine version
        // Computer user specific fields
        opponentType: isOpponentComputer ? 'computer' : 'pvp',
        difficulty: opponentDifficulty, // Store difficulty if opponent is computer
        // Snapshot creator info at game creation
        creatorDisplayName: creatorName,
        creatorAvatarKey: creatorSettings.avatarKey || 'dolphin',
        // Snapshot opponent info at game creation
        opponentDisplayName: opponentName,
        opponentAvatarKey: opponentSettings.avatarKey || 'dolphin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    // If time control is enabled and game is active, initialize time tracking
    if (isOpponentComputer && gameData.timeControl?.totalSeconds) {
        gameData.timeRemaining = {
            [creatorId]: gameData.timeControl.totalSeconds,
            [opponentId]: gameData.timeControl.totalSeconds,
        };
        gameData.lastMoveTime = serverTimestamp();
    }

    const gameRef = await db.collection('games').add(gameData);

    // If computer user, auto-accept (game already active)
    if (isOpponentComputer) {
        // Send notification to creator that game was accepted
        await db.collection('notifications').add({
            userId: creatorId,
            type: 'game_accepted',
            gameId: gameRef.id,
            from: opponentId,
            fromName: opponentName, // Include computer user's mocked display name
            opponentName: opponentName, // Also include for consistency
            opponentAvatarKey: opponentSettings.avatarKey || 'dolphin',
            read: false,
            createdAt: serverTimestamp(),
        });

        // Send push notification with computer user's display name
        sendGameAcceptedNotification(creatorId, opponentId, opponentName, gameRef.id).catch(
            (error) => console.error('Error sending push notification:', error),
        );

        // If computer user is white (goes first), trigger their move immediately
        // Wait a small delay to ensure game document is fully written
        if (whitePlayerId === opponentId) {
            console.log(
                `[createGameHandler] Computer user ${opponentId} is white, triggering first move`,
            );
            // Small delay to ensure game document is written, then trigger move
            // Reduced delay for faster game start
            setTimeout(async () => {
                try {
                    // Fetch fresh game data to ensure we have the latest
                    const freshGameDoc = await db.collection('games').doc(gameRef.id).get();
                    if (freshGameDoc.exists) {
                        await makeComputerMoveHelper(gameRef.id, freshGameDoc.data());
                    } else {
                        console.error(
                            `[createGameHandler] Game ${gameRef.id} not found when trying to make computer move`,
                        );
                    }
                } catch (error) {
                    console.error(
                        `[createGameHandler] Error making computer move for ${opponentId}:`,
                        error,
                    );
                }
            }, 200); // Reduced to 200ms for faster response
        }
    } else {
        // Send notification to opponent
        await db.collection('notifications').add({
            userId: opponentId,
            type: 'game_invite',
            gameId: gameRef.id,
            from: creatorId,
            read: false,
            createdAt: serverTimestamp(),
        });

        // Send push notification
        sendGameRequestNotification(
            opponentId,
            creatorId,
            creatorName,
            gameRef.id,
            creatorData.settings?.avatarKey || 'dolphin',
        ).catch((error) => console.error('Error sending push notification:', error));
    }

    return {
        success: true,
        gameId: gameRef.id,
        message: isOpponentComputer ? 'Game started successfully' : 'Game created successfully',
        versionCheck,
    };
}

/**
 * Create a new PvP game
 * POST /api/game/create
 */
export const createGame = onCall(getAppCheckConfig(), async (request) => {
    try {
        return await createGameHandler(request);
    } catch (error) {
        console.error('Error creating PvP game:', error);
        throw new HttpsError('internal', error.message);
    }
});
export { createGameHandler };

/**
 * Handler function for creating a computer game
 * @param {Object} request - Request object with data and auth
 * @returns {Promise<Object>} Game creation result
 */
export async function createComputerGameHandler(request) {
    const { data, auth } = request;
    if (!auth) {
        throw new HttpsError('unauthenticated', 'User must be authenticated');
    }

    try {
        const { timeControl, difficulty, clientVersion } = data;
        const userId = auth.uid;

        // Validate client version
        const versionCheck = clientVersion ? validateGameVersion(clientVersion) : null;

        // Initialize time control and time remaining
        const finalTimeControl = timeControl || { type: 'unlimited' };
        const timeRemaining = finalTimeControl.totalSeconds
            ? {
                  [userId]: finalTimeControl.totalSeconds,
                  computer: finalTimeControl.totalSeconds,
              }
            : null;

        // Create game document with computer opponent
        const gameData = {
            creatorId: userId,
            opponentId: 'computer', // Special ID for computer opponent
            opponentType: 'computer',
            difficulty: difficulty || 'random', // 'random', 'easy', 'medium', 'hard'
            status: 'active', // Computer games start immediately
            currentTurn: userId, // User goes first (white)
            timeControl: finalTimeControl,
            timeRemaining: timeRemaining,
            lastMoveTime: serverTimestamp(),
            moves: [],
            gameState: initializeGameState(),
            version: GAME_VERSION, // Store game engine version
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        };

        const gameRef = await db.collection('games').add(gameData);

        // Create timeout task for user's first move if time control is enabled
        if (finalTimeControl.totalSeconds && timeRemaining && timeRemaining[userId]) {
            const taskName = await createTimeoutTask(gameRef.id, timeRemaining[userId]);
            if (taskName) {
                await gameRef.update({ pendingTimeoutTask: taskName });
            }
        }

        return {
            success: true,
            gameId: gameRef.id,
            message: 'Computer game created successfully',
            versionCheck,
        };
    } catch (error) {
        console.error('Error creating computer game:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message);
    }
}

/**
 * Create a new game against the computer
 * POST /api/game/createComputer
 */
export const createComputerGame = onCall(getAppCheckConfig(), async (request) => {
    try {
        return await createComputerGameHandler(request);
    } catch (error) {
        console.error('Error creating computer game:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Accept, decline, or cancel a game invitation
 * POST /api/game/respond
 *
 * Authorization:
 * - Recipient (opponentId) can accept or decline
 * - Sender (creatorId) can cancel (decline)
 * - Both can decline/cancel only if game status is 'pending'
 */
export const respondToGameInvite = onCall(getAppCheckConfig(), async (request) => {
    const { data, auth } = request;
    try {
        if (!auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId, accept } = data;
        const userId = auth.uid;

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Check if recipient is a computer user - if so, auto-accept
        const isRecipientComputer = isComputerUser(gameData.opponentId);
        if (isRecipientComputer && gameData.status === 'pending') {
            // Auto-accept for computer users
            accept = true;
            console.log(
                `[respondToGameInvite] Auto-accepting game ${gameId} for computer user ${gameData.opponentId}`,
            );
        }

        // Verify game is in pending status (unless auto-accepted)
        if (gameData.status !== 'pending' && !isRecipientComputer) {
            throw new HttpsError('failed-precondition', 'Game is not in pending status');
        }

        // Authorization: Check if user is the recipient or sender
        const isRecipient = gameData.opponentId === userId;
        const isSender = gameData.creatorId === userId;

        if (!isRecipient && !isSender) {
            throw new HttpsError('permission-denied', 'Not authorized');
        }

        // Only recipient can accept (sender cannot accept their own request)
        // Exception: Computer users auto-accept, but this is handled server-side
        if (accept && !isRecipient && !isRecipientComputer) {
            throw new HttpsError(
                'permission-denied',
                'Only the recipient can accept a game invitation',
            );
        }

        // Prepare update data
        const updateData = {
            status: accept ? 'active' : 'cancelled',
            updatedAt: serverTimestamp(),
        };

        // If accepted, initialize time tracking
        if (accept && gameData.timeControl && gameData.timeControl.totalSeconds) {
            updateData.timeRemaining = {
                [gameData.creatorId]: gameData.timeControl.totalSeconds,
                [gameData.opponentId]: gameData.timeControl.totalSeconds,
            };
            updateData.lastMoveTime = serverTimestamp();

            // Create timeout task for the first player (white/current turn)
            const firstPlayerTime = gameData.timeControl.totalSeconds;
            const taskName = await createTimeoutTask(gameId, firstPlayerTime);
            if (taskName) {
                updateData.pendingTimeoutTask = taskName;
            }
        }

        // Update game status
        await db.collection('games').doc(gameId).update(updateData);

        // Get updated game data for computer move check
        const updatedGameData = { ...gameData, ...updateData };

        // If accepted, notify the creator and cancel other pending games
        if (accept) {
            const accepterDoc = await db.collection('users').doc(userId).get();
            const accepterData = accepterDoc.data();
            const accepterName = formatDisplayName(
                accepterData.displayName,
                accepterData.discriminator,
            );

            // Cancel all other pending games involving the accepter
            // This prevents multiple simultaneous games with the same player
            const pendingGamesQuery1 = await db
                .collection('games')
                .where('creatorId', '==', userId)
                .where('status', '==', 'pending')
                .get();

            const pendingGamesQuery2 = await db
                .collection('games')
                .where('opponentId', '==', userId)
                .where('status', '==', 'pending')
                .get();

            const batch = db.batch();

            // Cancel all pending games (except the one being accepted)
            [...pendingGamesQuery1.docs, ...pendingGamesQuery2.docs].forEach((doc) => {
                if (doc.id !== gameId) {
                    batch.update(doc.ref, {
                        status: 'cancelled',
                        updatedAt: serverTimestamp(),
                    });
                }
            });

            await batch.commit();

            // Send in-app notification to game creator
            await db.collection('notifications').add({
                userId: gameData.creatorId,
                type: 'game_accepted',
                gameId: gameId,
                from: userId,
                read: false,
                createdAt: serverTimestamp(),
            });

            // Send push notification to game creator
            sendGameAcceptedNotification(gameData.creatorId, userId, accepterName, gameId).catch(
                (error) => console.error('Error sending push notification:', error),
            );

            // If computer user accepted and is white (goes first), trigger their move immediately
            // Wait a small delay to ensure game document update is fully written
            if (isRecipientComputer && updatedGameData.whitePlayerId === userId) {
                console.log(
                    `[respondToGameInvite] Computer user ${userId} is white, triggering first move`,
                );
                // Small delay to ensure game document update is written, then trigger move
                // Reduced delay for faster game start
                setTimeout(async () => {
                    try {
                        // Fetch fresh game data to ensure we have the latest
                        const freshGameDoc = await db.collection('games').doc(gameId).get();
                        if (freshGameDoc.exists) {
                            await makeComputerMoveHelper(gameId, freshGameDoc.data());
                        } else {
                            console.error(
                                `[respondToGameInvite] Game ${gameId} not found when trying to make computer move`,
                            );
                        }
                    } catch (error) {
                        console.error(
                            `[respondToGameInvite] Error making computer move for ${userId}:`,
                            error,
                        );
                    }
                }, 200); // Reduced to 200ms for faster response
            }
        }

        // Determine the appropriate message
        let message = 'Game declined';
        if (accept) {
            message = 'Game started';
        } else if (isSender) {
            message = 'Game invitation canceled';
        }

        return {
            success: true,
            message,
            gameId: gameId,
        };
    } catch (error) {
        console.error('Error responding to game invite:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Make a move in a PvP game
 * POST /api/game/move
 * Server-side move validation prevents cheating
 */
export const makeMove = onCall(getAppCheckConfig(), async (request) => {
    const { data, auth } = request;
    try {
        if (!auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId, move, version } = data;
        const userId = auth.uid;

        // Validate game version
        validateGameVersion(version);

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify it's the user's turn
        if (gameData.currentTurn !== userId) {
            throw new HttpsError('permission-denied', 'Not your turn');
        }

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new HttpsError('permission-denied', 'Not a player in this game');
        }

        // CRITICAL: Validate move using game engine to prevent cheating
        // Pass full game state (includes coral data) not just FEN
        const currentGameState = gameData.gameState || { fen: gameData.fen };

        const validation = validateMove(currentGameState, move);

        if (!validation.valid) {
            console.error('[makeMove] Invalid move:', {
                error: validation.error,
                move,
                fen: currentGameState.fen,
                turn: currentGameState.turn,
            });
            throw new HttpsError('invalid-argument', `Invalid move: ${validation.error}`);
        }

        // Add validated move to moves array
        const moves = gameData.moves || [];
        moves.push({
            playerId: userId,
            move: validation.result,
            timestamp: new Date(),
        });

        // Toggle turn (unless game is over)
        const nextTurn = validation.gameState.isGameOver
            ? null
            : gameData.currentTurn === gameData.creatorId
              ? gameData.opponentId
              : gameData.creatorId;

        // Check if game is over (use full game state, not just FEN)
        let gameResult = getGameResult(validation.gameState);

        // Handle time tracking if enabled
        let updatedTimeRemaining = gameData.timeRemaining;
        if (gameData.timeControl?.totalSeconds && gameData.timeRemaining && gameData.lastMoveTime) {
            const now = Date.now();
            const lastMoveTimestamp = gameData.lastMoveTime.toDate
                ? gameData.lastMoveTime.toDate().getTime()
                : gameData.lastMoveTime;
            const elapsedSeconds = Math.floor((now - lastMoveTimestamp) / 1000);

            // Decrement the current player's time
            const currentPlayerTime =
                gameData.timeRemaining[userId] || gameData.timeControl.totalSeconds;
            const newTimeRemaining = Math.max(0, currentPlayerTime - elapsedSeconds);

            updatedTimeRemaining = {
                ...gameData.timeRemaining,
                [userId]: newTimeRemaining,
            };

            // Check if player ran out of time
            if (newTimeRemaining <= 0) {
                gameResult = {
                    isOver: true,
                    result: userId === gameData.creatorId ? 'loss' : 'win',
                    reason: 'timeout',
                    winner:
                        userId === gameData.creatorId ? gameData.opponentId : gameData.creatorId,
                };
            }
        }

        // Update game with validated state
        const updateData = {
            moves,
            currentTurn: nextTurn,
            gameState: validation.gameState,
            fen: validation.newFen,
            updatedAt: serverTimestamp(),
            lastMoveTime: serverTimestamp(), // Always update so triggers can detect moves (even without time control)
        };

        // Update time tracking if enabled
        if (gameData.timeControl?.totalSeconds) {
            updateData.timeRemaining = updatedTimeRemaining;
        }

        if (gameResult.isOver) {
            updateData.status = 'completed';
            updateData.result = gameResult.result;
            updateData.resultReason = gameResult.reason;
            updateData.winner = gameResult.winner || null;
            updateData.pendingTimeoutTask = null; // Clear task reference
        }

        // Cancel old timeout task before creating new one
        // Skip Firestore update - we'll include pendingTimeoutTask in the main update below
        if (gameData.pendingTimeoutTask) {
            await cancelPendingTimeoutTask(gameId, gameData.pendingTimeoutTask, true);
        }

        // Create new timeout task for next player (if game continues and time control enabled)
        if (
            !gameResult.isOver &&
            nextTurn &&
            gameData.timeControl?.totalSeconds &&
            updatedTimeRemaining
        ) {
            const nextPlayerTime = updatedTimeRemaining[nextTurn];
            if (nextPlayerTime && nextPlayerTime > 0) {
                const taskName = await createTimeoutTask(gameId, nextPlayerTime);
                if (taskName) {
                    updateData.pendingTimeoutTask = taskName;
                } else {
                    // If task creation failed, clear pendingTimeoutTask
                    updateData.pendingTimeoutTask = null;
                }
            } else {
                // No time remaining, clear pendingTimeoutTask
                updateData.pendingTimeoutTask = null;
            }
        } else if (gameData.pendingTimeoutTask) {
            // Game is over or no time control, clear pendingTimeoutTask
            updateData.pendingTimeoutTask = null;
        }

        await db.collection('games').doc(gameId).update(updateData);

        // Notify opponent (if game continues and not computer)
        if (!gameResult.isOver && nextTurn && nextTurn !== 'computer') {
            // Check if a notification already exists for this move to prevent duplicates
            // Use existing index: userId + read + createdAt
            // Check for recent notifications (within last 3 seconds) to catch race conditions
            const recentNotificationsQuery = await db
                .collection('notifications')
                .where('userId', '==', nextTurn)
                .where('read', '==', false)
                .orderBy('createdAt', 'desc')
                .limit(5)
                .get();

            // Check if there's already a move_made notification for this game from this user
            const hasRecentNotification = recentNotificationsQuery.docs.some((doc) => {
                const data = doc.data();
                const isRecent =
                    data.createdAt?.toDate && Date.now() - data.createdAt.toDate().getTime() < 3000;
                return (
                    isRecent &&
                    data.type === 'move_made' &&
                    data.gameId === gameId &&
                    data.from === userId
                );
            });

            if (!hasRecentNotification) {
                // Create notification document
                await db.collection('notifications').add({
                    userId: nextTurn,
                    type: 'move_made',
                    gameId: gameId,
                    from: userId,
                    read: false,
                    createdAt: serverTimestamp(),
                });
            }

            // Send push notification (always send, as it's idempotent)
            const currentUserDoc = await db.collection('users').doc(userId).get();
            const currentUserData = currentUserDoc.data();
            const currentUserName = formatDisplayName(
                currentUserData.displayName,
                currentUserData.discriminator,
            );

            await sendOpponentMoveNotification(nextTurn, gameId, userId, currentUserName).catch(
                (error) => console.error('Error sending opponent move notification:', error),
            );
        }

        // Notify both players if game is over
        if (gameResult.isOver) {
            // Notify creator
            await db.collection('notifications').add({
                userId: gameData.creatorId,
                type: 'game_over',
                gameId: gameId,
                result: gameResult,
                read: false,
                createdAt: serverTimestamp(),
            });

            // Notify opponent (only if not computer)
            if (gameData.opponentId !== 'computer') {
                await db.collection('notifications').add({
                    userId: gameData.opponentId,
                    type: 'game_over',
                    gameId: gameId,
                    result: gameResult,
                    read: false,
                    createdAt: serverTimestamp(),
                });
            }

            // Update player stats (skip computer)
            if (gameResult.winner) {
                const winnerId =
                    gameResult.winner === 'w' ? gameData.creatorId : gameData.opponentId;
                const loserId =
                    gameResult.winner === 'w' ? gameData.opponentId : gameData.creatorId;

                // Update winner stats (if not computer)
                if (winnerId !== 'computer') {
                    await db
                        .collection('users')
                        .doc(winnerId)
                        .update({
                            'stats.gamesPlayed': increment(1),
                            'stats.gamesWon': increment(1),
                        });
                }

                // Update loser stats (if not computer)
                if (loserId !== 'computer') {
                    await db
                        .collection('users')
                        .doc(loserId)
                        .update({
                            'stats.gamesPlayed': increment(1),
                            'stats.gamesLost': increment(1),
                        });
                }
            } else {
                // Draw - update creator stats
                await db
                    .collection('users')
                    .doc(gameData.creatorId)
                    .update({
                        'stats.gamesPlayed': increment(1),
                        'stats.gamesDraw': increment(1),
                    });

                // Update opponent stats (only if not computer)
                if (gameData.opponentId !== 'computer') {
                    await db
                        .collection('users')
                        .doc(gameData.opponentId)
                        .update({
                            'stats.gamesPlayed': increment(1),
                            'stats.gamesDraw': increment(1),
                        });
                }
            }
        }

        return {
            success: true,
            message: 'Move made successfully',
            gameState: validation.gameState,
            gameOver: gameResult.isOver,
            result: gameResult.isOver ? gameResult : undefined,
            opponentType: gameData.opponentType, // Include to determine if computer move needed
        };
    } catch (error) {
        console.error('Error making move:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Make a computer move
 * POST /api/game/makeComputerMove
 * @param {string} gameId - The game ID
 */
export const makeComputerMove = onCall(getAppCheckConfig(), async (request) => {
    const { data, auth: _auth } = request;
    try {
        const { gameId, version } = data;

        if (!gameId) {
            throw new HttpsError('invalid-argument', 'Game ID is required');
        }

        // Validate game version
        validateGameVersion(version);

        const gameDoc = await db.collection('games').doc(gameId).get();
        if (!gameDoc.exists) {
            throw new HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify this is a computer game
        if (gameData.opponentType !== 'computer') {
            throw new HttpsError('failed-precondition', 'Not a computer game');
        }

        // Verify it's the computer's turn
        if (gameData.currentTurn !== 'computer') {
            throw new HttpsError('failed-precondition', "Not the computer's turn");
        }

        // Verify game is not over
        if (gameData.status !== 'active') {
            throw new HttpsError('failed-precondition', 'Game is not active');
        }

        const result = await makeComputerMoveHelper(gameId, gameData);

        return {
            success: true,
            message: 'Computer move made successfully',
            ...result,
        };
    } catch (error) {
        console.error('Error making computer move:', error);
        if (error instanceof HttpsError) {
            throw error;
        }
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Helper function to make a computer move
 * @param {string} gameId - The game ID
 * @param {Object} gameData - Game data (optional, will fetch if not provided)
 * @returns {Promise<Object>} Computer move result
 */
export async function makeComputerMoveHelper(gameId, gameData = null) {
    if (!gameData) {
        const gameDoc = await db.collection('games').doc(gameId).get();
        if (!gameDoc.exists) {
            throw new Error('Game not found');
        }
        gameData = gameDoc.data();
    }

    // Get current game state (includes coral data)
    const currentGameState = gameData.gameState || { fen: gameData.fen };

    const game = new CoralClash();

    // Restore full game state including coral
    restoreGameFromSnapshot(game, currentGameState);

    // Get all legal moves
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) {
        throw new Error('No legal moves available for computer');
    }

    // Track time for computer move calculation
    const moveStartTime = Date.now();
    let moveCalculationTimeMs = 0;

    // Get difficulty level (default to 'random' if not set)
    const difficulty = gameData.difficulty || 'random';

    // Determine computer user ID (could be 'computer' for old games or a computer user ID)
    const computerUserId = gameData.opponentType === 'computer' ? gameData.opponentId : 'computer';
    const isComputerUserId = computerUserId !== 'computer';

    // Determine computer's color (could be white or black)
    const computerColor = gameData.whitePlayerId === computerUserId ? 'w' : 'b';

    // Extract last computer move to prevent reversing moves
    const moves_array = gameData.moves || [];
    let lastComputerMove = null;
    // Find the last move made by the computer (check both 'computer' and computer user IDs)
    for (let i = moves_array.length - 1; i >= 0; i--) {
        if (
            (moves_array[i].playerId === 'computer' ||
                moves_array[i].playerId === computerUserId) &&
            moves_array[i].move
        ) {
            const lastMove = moves_array[i].move;
            lastComputerMove = {
                from: lastMove.from,
                to: lastMove.to,
                piece: lastMove.piece,
                color: lastMove.color || computerColor, // Use detected computer color
            };
            break;
        }
    }

    // Select move based on difficulty
    let selectedMove;

    switch (difficulty) {
        case 'random': {
            // Random move selection (still avoid reversing moves)
            if (lastComputerMove) {
                // Filter out reversing moves from random selection
                const nonReversingMoves = moves.filter(
                    (m) =>
                        !(
                            m.from === lastComputerMove.to &&
                            m.to === lastComputerMove.from &&
                            m.piece?.toLowerCase() === lastComputerMove.piece?.toLowerCase()
                        ),
                );
                if (nonReversingMoves.length > 0) {
                    selectedMove =
                        nonReversingMoves[Math.floor(Math.random() * nonReversingMoves.length)];
                } else {
                    // If all moves are reversing (shouldn't happen), use random
                    selectedMove = moves[Math.floor(Math.random() * moves.length)];
                }
            } else {
                selectedMove = moves[Math.floor(Math.random() * moves.length)];
            }
            moveCalculationTimeMs = Date.now() - moveStartTime;
            break;
        }
        case 'easy': {
            // Easy mode: Use iterative deepening with time control
            const maxDepth = SEARCH_DEPTH.easy;
            const timeControl = getTimeControlForDifficulty('easy');

            const result = findBestMoveIterativeDeepening(
                currentGameState,
                maxDepth,
                computerColor,
                timeControl.maxTimeMs,
                null, // progressCallback
                lastComputerMove,
                null, // evaluationTable
                'easy', // difficulty
            );

            if (result.move) {
                selectedMove = result.move;
                moveCalculationTimeMs = result.elapsedMs || Date.now() - moveStartTime;
            } else {
                // Fallback to random if no move found
                console.warn('[EASY] AI search found no move, falling back to random');
                selectedMove = moves[Math.floor(Math.random() * moves.length)];
                moveCalculationTimeMs = Date.now() - moveStartTime;
            }
            break;
        }
        case 'medium': {
            // Medium mode: Use iterative deepening with time control
            const maxDepth = SEARCH_DEPTH.medium;
            const timeControl = getTimeControlForDifficulty('medium');

            const result = findBestMoveIterativeDeepening(
                currentGameState,
                maxDepth,
                computerColor,
                timeControl.maxTimeMs,
                null, // progressCallback
                lastComputerMove,
                null, // evaluationTable
                'medium', // difficulty
            );

            if (result.move) {
                selectedMove = result.move;
                moveCalculationTimeMs = result.elapsedMs || Date.now() - moveStartTime;
            } else {
                console.warn('[MEDIUM] AI search found no move, falling back to random');
                selectedMove = moves[Math.floor(Math.random() * moves.length)];
                moveCalculationTimeMs = Date.now() - moveStartTime;
            }
            break;
        }
        case 'hard': {
            // Hard mode: Use iterative deepening with time control
            const maxDepth = SEARCH_DEPTH.hard;
            const timeControl = getTimeControlForDifficulty('hard');

            const result = findBestMoveIterativeDeepening(
                currentGameState,
                maxDepth,
                computerColor,
                timeControl.maxTimeMs,
                null, // progressCallback
                lastComputerMove,
                null, // evaluationTable
                'hard', // difficulty
            );

            if (result.move) {
                selectedMove = result.move;
                moveCalculationTimeMs = result.elapsedMs || Date.now() - moveStartTime;
            } else {
                console.warn('[HARD] AI search found no move, falling back to random');
                selectedMove = moves[Math.floor(Math.random() * moves.length)];
                moveCalculationTimeMs = Date.now() - moveStartTime;
            }
            break;
        }
        default: {
            // Unknown difficulty, default to random (still avoid reversing moves)
            console.warn(`Unknown difficulty level: ${difficulty}, defaulting to random`);
            if (lastComputerMove) {
                // Filter out reversing moves from random selection
                const nonReversingMoves = moves.filter(
                    (m) =>
                        !(
                            m.from === lastComputerMove.to &&
                            m.to === lastComputerMove.from &&
                            m.piece?.toLowerCase() === lastComputerMove.piece?.toLowerCase()
                        ),
                );
                if (nonReversingMoves.length > 0) {
                    selectedMove =
                        nonReversingMoves[Math.floor(Math.random() * nonReversingMoves.length)];
                } else {
                    // If all moves are reversing (shouldn't happen), use random
                    selectedMove = moves[Math.floor(Math.random() * moves.length)];
                }
            } else {
                selectedMove = moves[Math.floor(Math.random() * moves.length)];
            }
            moveCalculationTimeMs = Date.now() - moveStartTime;
            break;
        }
    }

    // Make the move
    const moveResult = game.move({
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: selectedMove.promotion,
        coralPlaced: selectedMove.coralPlaced,
        coralRemoved: selectedMove.coralRemoved,
        coralRemovedSquares: selectedMove.coralRemovedSquares,
    });

    // Validate the move (pass full game state for proper validation)
    // IMPORTANT: Pass the coral flags so validation uses the SAME move variant
    const validation = validateMove(currentGameState, {
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: selectedMove.promotion,
        coralPlaced: selectedMove.coralPlaced,
        coralRemoved: selectedMove.coralRemoved,
        coralRemovedSquares: selectedMove.coralRemovedSquares,
    });

    if (!validation.valid) {
        throw new Error(`Computer move validation failed: ${validation.error}`);
    }

    // Add computer move to moves array (moves_array was already retrieved earlier)
    // Use computer user ID if it's a computer user, otherwise use 'computer'
    moves_array.push({
        playerId: computerUserId,
        move: validation.result,
        timestamp: new Date(),
    });

    // Toggle turn to the other player (not the computer)
    // Computer could be creator or opponent, so toggle accordingly
    const nextTurn =
        gameData.currentTurn === gameData.creatorId ? gameData.opponentId : gameData.creatorId;

    // Handle time tracking if enabled
    let updatedTimeRemaining = gameData.timeRemaining;
    let computerTimeExpired = false;

    if (gameData.timeControl?.totalSeconds && gameData.timeRemaining) {
        // Get computer's current time (check both 'computer' key and computer user ID)
        const computerTime =
            gameData.timeRemaining[computerUserId] ||
            gameData.timeRemaining.computer ||
            gameData.timeControl.totalSeconds;

        // Decrement computer's time by the calculation time (in seconds)
        // The computer's clock runs while it calculates the move
        const calculationTimeSeconds = Math.floor(moveCalculationTimeMs / 1000);
        const newComputerTime = Math.max(0, computerTime - calculationTimeSeconds);

        updatedTimeRemaining = {
            ...gameData.timeRemaining,
            [computerUserId]: newComputerTime,
        };

        // Remove old 'computer' key if it exists and we're using a computer user ID
        if (isComputerUserId && updatedTimeRemaining.computer !== undefined) {
            delete updatedTimeRemaining.computer;
        }

        // Check if computer ran out of time
        if (newComputerTime <= 0) {
            computerTimeExpired = true;
        }
    }

    // Check if game is over (use full game state, not just FEN)
    let gameResult = getGameResult(validation.gameState);

    // Override game result if computer ran out of time
    if (computerTimeExpired) {
        // Update game state to mark computer as resigned (black player)
        validation.gameState = {
            ...validation.gameState,
            resigned: 'b', // Computer is always black
        };

        gameResult = {
            isOver: true,
            result: 'win', // Human player wins
            reason: 'timeout',
            winner: gameData.creatorId,
        };
    }

    // Update game with computer move
    const updateData = {
        moves: moves_array,
        currentTurn: gameResult.isOver ? null : nextTurn,
        gameState: validation.gameState,
        fen: validation.newFen,
        updatedAt: serverTimestamp(),
        lastMoveTime: serverTimestamp(), // Always update so triggers can detect moves (even without time control)
    };

    // Update time tracking if enabled
    if (gameData.timeControl?.totalSeconds) {
        updateData.timeRemaining = updatedTimeRemaining;
    }

    // Cancel old timeout task before creating new one (if game continues) or clearing (if game over)
    if (gameData.pendingTimeoutTask) {
        await cancelPendingTimeoutTask(gameId, gameData.pendingTimeoutTask);
    }

    if (gameResult.isOver) {
        updateData.status = 'completed';
        updateData.result = gameResult.result;
        updateData.resultReason = gameResult.reason;
        updateData.winner = gameResult.winner || null;
        updateData.pendingTimeoutTask = null; // Clear task reference

        // Update player stats
        if (gameResult.winner) {
            const winnerId = gameResult.winner === 'w' ? gameData.creatorId : 'computer';
            const loserId = gameResult.winner === 'w' ? 'computer' : gameData.creatorId;

            if (winnerId !== 'computer') {
                await db
                    .collection('users')
                    .doc(winnerId)
                    .update({
                        'stats.gamesPlayed': increment(1),
                        'stats.gamesWon': increment(1),
                    });
            }

            if (loserId !== 'computer') {
                await db
                    .collection('users')
                    .doc(loserId)
                    .update({
                        'stats.gamesPlayed': increment(1),
                        'stats.gamesLost': increment(1),
                    });
            }
        } else {
            // Draw
            await db
                .collection('users')
                .doc(gameData.creatorId)
                .update({
                    'stats.gamesPlayed': increment(1),
                    'stats.gamesDraw': increment(1),
                });
        }

        // Notify player game is over
        await db.collection('notifications').add({
            userId: gameData.creatorId,
            type: 'game_over',
            gameId: gameId,
            result: gameResult,
            read: false,
            createdAt: serverTimestamp(),
        });
    } else {
        // Create new timeout task for human player (if game continues and time control enabled)
        if (gameData.timeControl?.totalSeconds && updatedTimeRemaining && nextTurn) {
            const humanPlayerTime = updatedTimeRemaining[nextTurn];
            if (humanPlayerTime && humanPlayerTime > 0) {
                const taskName = await createTimeoutTask(gameId, humanPlayerTime);
                if (taskName) {
                    updateData.pendingTimeoutTask = taskName;
                }
            }
        }

        // Notify player that opponent made a move (non-blocking)
        // For legacy 'computer' games, use 'Computer'
        // For mocked computer users, use their display name from game data
        const isLegacyComputer = computerUserId === 'computer';
        const computerDisplayName = isLegacyComputer
            ? 'Computer'
            : gameData.opponentDisplayName || 'Computer';
        const computerIdForNotification = computerUserId;

        // Send notification asynchronously (don't await to avoid blocking)
        sendOpponentMoveNotification(
            gameData.creatorId,
            gameId,
            computerIdForNotification,
            computerDisplayName,
        ).catch((error) => console.error('Error sending opponent move notification:', error));
    }

    await db.collection('games').doc(gameId).update(updateData);

    return {
        move: moveResult,
        gameState: validation.gameState,
        gameOver: gameResult.isOver,
        result: gameResult.isOver ? gameResult : undefined,
    };
}

/**
 * Check if current player's time has expired and end game if so
 * Called when loading a game to ensure time limits are enforced
 */
/**
 * Cancel pending timeout task for a game
 * @param {string} gameId - The game ID
 * @param {string} taskName - The task name to cancel
 * @param {boolean} skipFirestoreUpdate - If true, skip updating Firestore (caller will handle it)
 */
async function cancelPendingTimeoutTask(gameId, taskName, skipFirestoreUpdate = false) {
    // Skip in emulator
    if (process.env.FUNCTIONS_EMULATOR === 'true' || !taskName) {
        return;
    }

    try {
        const client = new CloudTasksClient();

        await client.deleteTask({ name: taskName });
        console.log(`Cancelled timeout task for game ${gameId}`);

        // Clear the task name from Firestore (unless caller will handle it)
        if (!skipFirestoreUpdate) {
            await db.collection('games').doc(gameId).update({
                pendingTimeoutTask: null,
            });
        }
    } catch (error) {
        // Task might already be executed or not exist, which is fine
        console.log(`Could not cancel task for game ${gameId}:`, error.message);
    }
}

/**
 * Create a Cloud Task to handle time expiration for the current player
 * @param {string} gameId - The game ID
 * @param {number} timeRemainingSeconds - Seconds remaining for the current player
 * @returns {Promise<string|null>} Task name or null if skipped
 */
async function createTimeoutTask(gameId, timeRemainingSeconds) {
    // Skip in emulator - timeouts won't work properly in local development
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        console.log(`[Emulator] Skipping timeout task creation for game ${gameId}`);
        return null;
    }

    // Don't create task if time is unlimited or already expired
    if (!timeRemainingSeconds || timeRemainingSeconds <= 0) {
        return null;
    }

    try {
        const client = new CloudTasksClient();
        const project = process.env.GCLOUD_PROJECT;
        const location = process.env.FUNCTION_REGION || 'us-central1';
        const queue = 'game-timeouts'; // You'll need to create this queue in GCP

        // Task should execute when time expires
        const scheduleTime = new Date(Date.now() + timeRemainingSeconds * 1000);

        const queuePath = client.queuePath(project, location, queue);

        // Get the function URL - adjust based on your deployment
        const functionUrl = `https://${location}-${project}.cloudfunctions.net/handleTimeExpiration`;

        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url: functionUrl,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: Buffer.from(JSON.stringify({ gameId })).toString('base64'),
                oidcToken: {
                    serviceAccountEmail: `${project}@appspot.gserviceaccount.com`,
                },
            },
            scheduleTime: {
                seconds: Math.floor(scheduleTime.getTime() / 1000),
            },
        };

        const [response] = await client.createTask({ parent: queuePath, task });
        console.log(`Created timeout task for game ${gameId}: ${response.name}`);

        return response.name;
    } catch (error) {
        console.error(`Error creating timeout task for game ${gameId}:`, error);
        // Don't fail the move if task creation fails
        return null;
    }
}

async function checkAndHandleTimeExpiration(gameId, gameData) {
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

        // Determine which color lost on time
        const loserColor = gameData.whitePlayerId === loser ? 'w' : 'b';

        // Update gameState to mark as resigned (same effect as resignation)
        const currentGameState = gameData.gameState || { fen: gameData.fen };
        const updatedGameState = {
            ...currentGameState,
            resigned: loserColor,
        };

        // Update game to completed
        await db
            .collection('games')
            .doc(gameId)
            .update({
                status: 'completed',
                result: loser === gameData.creatorId ? 'loss' : 'win',
                resultReason: 'timeout',
                winner: winner,
                gameState: updatedGameState,
                timeRemaining: {
                    ...gameData.timeRemaining,
                    [loser]: 0,
                },
                pendingTimeoutTask: null,
                updatedAt: serverTimestamp(),
            });

        // Update stats if not a computer game
        if (gameData.opponentId !== 'computer') {
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
            const isUserWinner = winner !== 'computer';
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
 * Check game time status
 * Called when loading a game to check if time has expired
 */
export const checkGameTime = onCall(getAppCheckConfig(), async (request) => {
    const { data, auth } = request;
    try {
        if (!auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId } = data;
        const userId = auth.uid;

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new HttpsError('permission-denied', 'Not a player in this game');
        }

        // Check for time expiration
        const result = await checkAndHandleTimeExpiration(gameId, gameData);

        return {
            success: true,
            timeExpired: result.timeExpired,
            winner: result.winner || null,
            loser: result.loser || null,
        };
    } catch (error) {
        console.error('Error checking game time:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * HTTP endpoint for Cloud Tasks to check time expiration
 * This is called at the exact time when a player's time should expire
 */
export const handleTimeExpiration = onRequest(
    {
        region: getFunctionRegion(), // Match Firestore region for lower latency
    },
    async (req, res) => {
        try {
            // Verify this is a Cloud Tasks request (basic security)
            const { gameId } = req.body;

            if (!gameId) {
                res.status(400).send('Missing gameId');
                return;
            }

            const gameDoc = await db.collection('games').doc(gameId).get();

            if (!gameDoc.exists) {
                res.status(404).send('Game not found');
                return;
            }

            const gameData = gameDoc.data();

            // Check and handle time expiration
            const result = await checkAndHandleTimeExpiration(gameId, gameData);

            res.status(200).json({
                success: true,
                timeExpired: result.timeExpired,
                winner: result.winner || null,
                loser: result.loser || null,
            });
        } catch (error) {
            console.error('Error in handleTimeExpiration:', error);
            res.status(500).send('Internal error');
        }
    },
);

/**
 * Resign from a game
 * POST /api/game/resign
 */
export const resignGame = onCall(getAppCheckConfig(), async (request) => {
    const { data, auth } = request;
    try {
        console.log('[resignGame] Starting resignation process');
        if (!auth) {
            console.error('[resignGame] Unauthenticated user');
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId } = data;
        const userId = auth.uid;
        console.log('[resignGame] User:', userId, 'Game:', gameId);

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            console.error('[resignGame] Game not found:', gameId);
            throw new HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();
        console.log('[resignGame] Game data retrieved:', {
            creatorId: gameData.creatorId,
            opponentId: gameData.opponentId,
            status: gameData.status,
        });

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            console.error('[resignGame] User is not a player in this game');
            throw new HttpsError('permission-denied', 'Not a player in this game');
        }

        // Check if game is already over
        if (gameData.status === 'completed' || gameData.status === 'cancelled') {
            console.error('[resignGame] Game is already finished:', gameData.status);
            throw new HttpsError('failed-precondition', 'Game is already finished');
        }

        // Determine winner (opponent wins when user resigns)
        const winner = gameData.creatorId === userId ? gameData.opponentId : gameData.creatorId;

        // Determine which color resigned
        const resignedColor = gameData.whitePlayerId === userId ? 'w' : 'b';
        console.log('[resignGame] Winner:', winner, 'Resigned color:', resignedColor);

        // Update the game state with resignation
        const currentGameState = gameData.gameState || { fen: gameData.fen };
        const updatedGameState = {
            ...currentGameState,
            resigned: resignedColor,
        };

        console.log('[resignGame] Updating game document to completed status');

        // Cancel pending timeout task
        if (gameData.pendingTimeoutTask) {
            await cancelPendingTimeoutTask(gameId, gameData.pendingTimeoutTask);
        }

        // Prepare update data
        const updateData = {
            status: 'completed',
            result: winner === gameData.creatorId ? 'creator_wins' : 'opponent_wins',
            resultReason: 'resignation',
            winner: winner,
            gameState: updatedGameState,
            pendingTimeoutTask: null,
            updatedAt: serverTimestamp(),
        };

        // Ensure display names are set correctly for computer users
        // This is important because real-time listeners read directly from the game document
        // Check if opponent is a computer user
        if (isComputerUser(gameData.opponentId)) {
            // If opponentDisplayName is missing or set to 'Computer', fetch the real name
            if (!gameData.opponentDisplayName || gameData.opponentDisplayName === 'Computer') {
                const opponentDoc = await db.collection('users').doc(gameData.opponentId).get();
                if (opponentDoc.exists) {
                    const opponentData = opponentDoc.data();
                    updateData.opponentDisplayName = formatDisplayName(
                        opponentData.displayName,
                        opponentData.discriminator,
                    );
                    if (opponentData.settings?.avatarKey) {
                        updateData.opponentAvatarKey = opponentData.settings.avatarKey;
                    }
                }
            }
        }
        // Check if creator is a computer user (when user is the opponent)
        if (isComputerUser(gameData.creatorId)) {
            // If creatorDisplayName is missing or set to 'Computer', fetch the real name
            if (!gameData.creatorDisplayName || gameData.creatorDisplayName === 'Computer') {
                const creatorDoc = await db.collection('users').doc(gameData.creatorId).get();
                if (creatorDoc.exists) {
                    const creatorData = creatorDoc.data();
                    updateData.creatorDisplayName = formatDisplayName(
                        creatorData.displayName,
                        creatorData.discriminator,
                    );
                    if (creatorData.settings?.avatarKey) {
                        updateData.creatorAvatarKey = creatorData.settings.avatarKey;
                    }
                }
            }
        }

        // Update game status
        await db.collection('games').doc(gameId).update(updateData);
        console.log('[resignGame] Game document updated successfully');

        // Update stats for both players (skip if opponent is computer)
        if (gameData.opponentId !== 'computer') {
            console.log('[resignGame] Updating stats for PvP game');
            // Winner gets a win - use set with merge to ensure stats exist
            await db
                .collection('users')
                .doc(winner)
                .set(
                    {
                        stats: {
                            gamesPlayed: increment(1),
                            gamesWon: increment(1),
                        },
                    },
                    { merge: true },
                );
            console.log('[resignGame] Winner stats updated');

            // Loser (user who resigned) gets a loss - use set with merge to ensure stats exist
            await db
                .collection('users')
                .doc(userId)
                .set(
                    {
                        stats: {
                            gamesPlayed: increment(1),
                            gamesLost: increment(1),
                        },
                    },
                    { merge: true },
                );
            console.log('[resignGame] Loser stats updated');

            // Send notification to opponent that they won
            const resignerDoc = await db.collection('users').doc(userId).get();
            const resignerData = resignerDoc.data();
            const resignerName = formatDisplayName(
                resignerData.displayName,
                resignerData.discriminator,
            );

            await db.collection('notifications').add({
                userId: winner,
                type: 'game_result',
                gameId: gameId,
                from: userId,
                result: 'win',
                reason: 'resignation',
                opponentName: resignerName,
                read: false,
                createdAt: serverTimestamp(),
            });
            console.log('[resignGame] Notification sent to winner');
        } else {
            console.log('[resignGame] Updating stats for computer game');
            // Computer game - only update user stats - use set with merge to ensure stats exist
            await db
                .collection('users')
                .doc(userId)
                .set(
                    {
                        stats: {
                            gamesPlayed: increment(1),
                            gamesLost: increment(1),
                        },
                    },
                    { merge: true },
                );
            console.log('[resignGame] User stats updated for computer game');
        }

        console.log('[resignGame] Resignation completed successfully');
        return {
            success: true,
            message: 'Game resigned successfully',
            winner: winner,
        };
    } catch (error) {
        console.error('[resignGame] Error resigning game:', error);
        console.error('[resignGame] Error stack:', error.stack);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Request to reset a game
 * For computer games: Auto-approves and resets immediately
 * For PvP games: Sends request to opponent for approval
 */
export const requestGameReset = onCall(getAppCheckConfig(), async (request) => {
    const { data, auth } = request;
    try {
        if (!auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId } = data;
        const userId = auth.uid;

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new HttpsError('permission-denied', 'Not a player in this game');
        }

        // Check if game is already over
        if (gameData.status === 'completed' || gameData.status === 'cancelled') {
            throw new HttpsError('failed-precondition', 'Game is already finished');
        }

        // Check if any moves have been made
        if (!gameData.moves || gameData.moves.length === 0) {
            throw new HttpsError(
                'failed-precondition',
                'Cannot reset game - no moves have been made yet',
            );
        }

        // Check if there's already a pending reset request
        if (gameData.resetRequestedBy) {
            throw new HttpsError('failed-precondition', 'A reset request is already pending');
        }

        const isComputerGame = gameData.opponentType === 'computer';

        if (isComputerGame) {
            // Computer game: Auto-approve and reset immediately
            const newGame = new CoralClash();
            const initialGameState = createGameSnapshot(newGame);

            // Cancel old timeout task before resetting
            if (gameData.pendingTimeoutTask) {
                await cancelPendingTimeoutTask(gameId, gameData.pendingTimeoutTask);
            }

            const updateData = {
                gameState: initialGameState,
                fen: newGame.fen(),
                moves: [],
                currentTurn: gameData.creatorId, // White always starts
                resetRequestedBy: null,
                resetRequestStatus: null,
                updatedAt: serverTimestamp(),
            };

            // Create new timeout task if time control is enabled
            if (gameData.timeControl?.totalSeconds && gameData.timeRemaining) {
                const playerTime =
                    gameData.timeRemaining[gameData.creatorId] || gameData.timeControl.totalSeconds;
                const taskName = await createTimeoutTask(gameId, playerTime);
                if (taskName) {
                    updateData.pendingTimeoutTask = taskName;
                } else {
                    updateData.pendingTimeoutTask = null;
                }
            } else {
                updateData.pendingTimeoutTask = null;
            }

            await db.collection('games').doc(gameId).update(updateData);

            return {
                success: true,
                message: 'Game reset successfully',
                autoApproved: true,
            };
        } else {
            // PvP game: Set pending status and notify opponent
            const opponentId =
                gameData.creatorId === userId ? gameData.opponentId : gameData.creatorId;

            await db.collection('games').doc(gameId).update({
                resetRequestedBy: userId,
                resetRequestStatus: 'pending',
                updatedAt: serverTimestamp(),
            });

            // Send notification to opponent
            await db.collection('notifications').add({
                userId: opponentId,
                type: 'reset_requested',
                gameId: gameId,
                from: userId,
                read: false,
                createdAt: serverTimestamp(),
            });

            return {
                success: true,
                message: 'Reset request sent to opponent',
                autoApproved: false,
            };
        }
    } catch (error) {
        console.error('Error requesting game reset:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Respond to a game reset request (approve or reject)
 * Only for PvP games
 */
export const respondToResetRequest = onCall(getAppCheckConfig(), async (request) => {
    const { data, auth } = request;
    try {
        if (!auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId, approve } = data;
        const userId = auth.uid;

        if (typeof approve !== 'boolean') {
            throw new HttpsError('invalid-argument', 'approve must be a boolean');
        }

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify there's a pending reset request
        if (!gameData.resetRequestedBy || gameData.resetRequestStatus !== 'pending') {
            throw new HttpsError('failed-precondition', 'No reset request pending');
        }

        // Verify user is the opponent (not the requester), unless they're canceling
        // Allow requester to reject (cancel) their own request, but not approve it
        if (gameData.resetRequestedBy === userId && approve) {
            throw new HttpsError('permission-denied', 'Cannot approve your own reset request');
        }

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new HttpsError('permission-denied', 'Not a player in this game');
        }

        const requesterId = gameData.resetRequestedBy;

        if (approve) {
            // Approved: Reset the game
            const newGame = new CoralClash();
            const initialGameState = createGameSnapshot(newGame);

            // Cancel old timeout task before resetting
            if (gameData.pendingTimeoutTask) {
                await cancelPendingTimeoutTask(gameId, gameData.pendingTimeoutTask);
            }

            const updateData = {
                gameState: initialGameState,
                fen: newGame.fen(),
                moves: [],
                currentTurn: gameData.creatorId, // White always starts
                resetRequestedBy: null,
                resetRequestStatus: 'approved',
                updatedAt: serverTimestamp(),
            };

            // Create new timeout task if time control is enabled
            if (gameData.timeControl?.totalSeconds && gameData.timeRemaining) {
                // Get the current turn player's time (creator always starts after reset)
                const playerTime =
                    gameData.timeRemaining[gameData.creatorId] || gameData.timeControl.totalSeconds;
                const taskName = await createTimeoutTask(gameId, playerTime);
                if (taskName) {
                    updateData.pendingTimeoutTask = taskName;
                } else {
                    updateData.pendingTimeoutTask = null;
                }
            } else {
                updateData.pendingTimeoutTask = null;
            }

            await db.collection('games').doc(gameId).update(updateData);

            // Send push notification to requester (person who asked for reset)
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const userName = formatDisplayName(userData.displayName, userData.discriminator);

            await sendResetApprovedNotification(requesterId, userId, userName, gameId).catch(
                (error) => console.error('Error sending reset approved notification:', error),
            );

            // Also send notification to approver (yourself) for in-app status display
            await sendResetApprovedNotification(userId, requesterId, 'Reset request', gameId).catch(
                (error) =>
                    console.error('Error sending reset approved notification to approver:', error),
            );

            return {
                success: true,
                message: 'Reset request approved',
                approved: true,
            };
        } else {
            // Rejected: Clear the request
            await db.collection('games').doc(gameId).update({
                resetRequestedBy: null,
                resetRequestStatus: 'rejected',
                updatedAt: serverTimestamp(),
            });

            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const userName = formatDisplayName(userData.displayName, userData.discriminator);

            if (requesterId === userId) {
                // User is cancelling their own request - notify the opponent
                const opponentId =
                    gameData.creatorId === userId ? gameData.opponentId : gameData.creatorId;

                await sendResetCancelledNotification(opponentId, userId, userName, gameId).catch(
                    (error) => console.error('Error sending reset cancelled notification:', error),
                );
            } else {
                // Opponent is rejecting the request - notify the requester
                await sendResetRejectedNotification(requesterId, userId, userName, gameId).catch(
                    (error) => console.error('Error sending reset rejected notification:', error),
                );
            }

            return {
                success: true,
                message:
                    requesterId === userId ? 'Reset request cancelled' : 'Reset request rejected',
                approved: false,
            };
        }
    } catch (error) {
        console.error('Error responding to reset request:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Get user's game history (completed and cancelled games)
 * GET /api/games/history
 */
export const getGameHistory = onCall(getAppCheckConfig(), async (request) => {
    const { data: _data, auth } = request;
    try {
        if (!auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = auth.uid;

        // Get games where user is creator or opponent and status is completed or cancelled
        // Fetch more games to ensure we have enough for stats (top 5 opponents could have multiple games each)
        const creatorGames = await db
            .collection('games')
            .where('creatorId', '==', userId)
            .where('status', 'in', ['completed', 'cancelled'])
            .orderBy('updatedAt', 'desc')
            .limit(50)
            .get();

        const opponentGames = await db
            .collection('games')
            .where('opponentId', '==', userId)
            .where('status', 'in', ['completed', 'cancelled'])
            .orderBy('updatedAt', 'desc')
            .limit(50)
            .get();

        const games = [];

        // Process creator games
        for (const doc of creatorGames.docs) {
            const gameData = doc.data();

            // Handle computer opponent (both old 'computer' ID and new computer user IDs)
            if (gameData.opponentId === 'computer' || isComputerUser(gameData.opponentId)) {
                // For old 'computer' ID, use hardcoded values
                if (gameData.opponentId === 'computer') {
                    games.push({
                        id: doc.id,
                        ...gameData,
                        opponentDisplayName: 'Computer',
                        opponentAvatarKey: 'computer',
                        opponentType: 'computer',
                    });
                } else {
                    // For computer users with actual user IDs, always fetch their display name
                    // This ensures we get the correct name even if game data has stale or incorrect values
                    const opponentDoc = await db.collection('users').doc(gameData.opponentId).get();
                    const opponentData = opponentDoc.exists ? opponentDoc.data() : {};
                    // Never use 'Computer' as fallback for computer users - always fetch from user doc or use static data
                    let opponentDisplayName = formatDisplayName(
                        opponentData.displayName,
                        opponentData.discriminator,
                    );
                    // If fetch failed, try static computer user data, then gameData (if not 'Computer')
                    if (!opponentDisplayName) {
                        const staticUserData = getComputerUserData(gameData.opponentId);
                        if (staticUserData) {
                            opponentDisplayName = formatDisplayName(
                                staticUserData.displayName,
                                staticUserData.discriminator,
                            );
                        } else if (
                            gameData.opponentDisplayName &&
                            gameData.opponentDisplayName !== 'Computer'
                        ) {
                            opponentDisplayName = gameData.opponentDisplayName;
                        } else {
                            opponentDisplayName = 'Unknown Computer';
                        }
                    }
                    const opponentAvatarKey =
                        opponentData.settings?.avatarKey ||
                        getComputerUserData(gameData.opponentId)?.avatarKey ||
                        gameData.opponentAvatarKey ||
                        'dolphin';

                    games.push({
                        id: doc.id,
                        ...gameData,
                        opponentDisplayName,
                        opponentAvatarKey,
                        opponentType: 'computer',
                    });
                }
            } else {
                // Use snapshot data if available, otherwise fetch current data
                let opponentDisplayName = gameData.opponentDisplayName;
                let opponentAvatarKey = gameData.opponentAvatarKey;

                if (!opponentDisplayName || !opponentAvatarKey) {
                    // Fallback: fetch current data if snapshot doesn't exist (old games)
                    const opponentDoc = await db.collection('users').doc(gameData.opponentId).get();
                    const opponentData = opponentDoc.exists ? opponentDoc.data() : {};
                    opponentDisplayName =
                        formatDisplayName(opponentData.displayName, opponentData.discriminator) ||
                        'Opponent';
                    opponentAvatarKey = opponentData.settings?.avatarKey || 'dolphin';
                }

                games.push({
                    id: doc.id,
                    ...gameData,
                    opponentDisplayName,
                    opponentAvatarKey,
                });
            }
        }

        // Process opponent games
        // Note: Computer games with old 'computer' ID won't be here, but computer users with actual IDs will be
        for (const doc of opponentGames.docs) {
            const gameData = doc.data();

            // For computer users, always fetch their display name to ensure correctness
            // For regular users, use snapshot data if available, otherwise fetch current data
            let opponentDisplayName = gameData.creatorDisplayName;
            let opponentAvatarKey = gameData.creatorAvatarKey;

            if (isComputerUser(gameData.creatorId)) {
                // Always fetch for computer users to ensure correct display name
                const creatorDoc = await db.collection('users').doc(gameData.creatorId).get();
                const creatorData = creatorDoc.exists ? creatorDoc.data() : {};
                // Never use 'Computer' as fallback for computer users - always fetch from user doc or use static data
                let fetchedDisplayName = formatDisplayName(
                    creatorData.displayName,
                    creatorData.discriminator,
                );
                // If fetch failed, try static computer user data, then gameData (if not 'Computer')
                if (!fetchedDisplayName) {
                    const staticUserData = getComputerUserData(gameData.creatorId);
                    if (staticUserData) {
                        fetchedDisplayName = formatDisplayName(
                            staticUserData.displayName,
                            staticUserData.discriminator,
                        );
                    } else if (
                        gameData.creatorDisplayName &&
                        gameData.creatorDisplayName !== 'Computer'
                    ) {
                        fetchedDisplayName = gameData.creatorDisplayName;
                    } else {
                        fetchedDisplayName = 'Unknown Computer';
                    }
                }
                opponentDisplayName = fetchedDisplayName;
                opponentAvatarKey =
                    creatorData.settings?.avatarKey ||
                    getComputerUserData(gameData.creatorId)?.avatarKey ||
                    gameData.creatorAvatarKey ||
                    'dolphin';
            } else if (!opponentDisplayName || !opponentAvatarKey) {
                // Fallback: fetch current data if snapshot doesn't exist (old games)
                const creatorDoc = await db.collection('users').doc(gameData.creatorId).get();
                const creatorData = creatorDoc.exists ? creatorDoc.data() : {};
                opponentDisplayName =
                    formatDisplayName(creatorData.displayName, creatorData.discriminator) ||
                    'Opponent';
                opponentAvatarKey = creatorData.settings?.avatarKey || 'dolphin';
            }

            games.push({
                id: doc.id,
                ...gameData,
                opponentDisplayName,
                opponentAvatarKey,
                opponentType: isComputerUser(gameData.creatorId) ? 'computer' : undefined,
            });
        }

        // Sort by most recently updated and return all
        games.sort((a, b) => {
            const aTime = a.updatedAt?.toMillis() || 0;
            const bTime = b.updatedAt?.toMillis() || 0;
            return bTime - aTime;
        });

        return {
            success: true,
            games: games,
        };
    } catch (error) {
        console.error('Error getting game history:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Get user's active games
 * GET /api/games/active
 */
export const getActiveGames = onCall(getAppCheckConfig(), async (request) => {
    const { data: _data, auth } = request;
    try {
        if (!auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = auth.uid;

        // Get games where user is creator or opponent and status is active or pending
        const creatorGames = await db
            .collection('games')
            .where('creatorId', '==', userId)
            .where('status', 'in', ['active', 'pending'])
            .get();

        const opponentGames = await db
            .collection('games')
            .where('opponentId', '==', userId)
            .where('status', 'in', ['active', 'pending'])
            .get();

        const games = [];

        // Process creator games (user is the creator)
        for (const doc of creatorGames.docs) {
            const gameData = doc.data();

            // Handle computer opponent
            if (gameData.opponentId === 'computer') {
                // Legacy computer game - always show 'Computer'
                games.push({
                    id: doc.id,
                    ...gameData,
                    opponentDisplayName: 'Computer',
                    opponentAvatarKey: 'computer',
                    opponentType: 'computer',
                });
            } else if (isComputerUser(gameData.opponentId)) {
                // Mocked computer user - always fetch their display name from user document
                // This ensures we get the correct name even if game data has stale or incorrect values
                const opponentDoc = await db.collection('users').doc(gameData.opponentId).get();
                const opponentData = opponentDoc.exists ? opponentDoc.data() : {};
                // Never use 'Computer' as fallback for computer users - always fetch from user doc or use static data
                let opponentDisplayName = formatDisplayName(
                    opponentData.displayName,
                    opponentData.discriminator,
                );
                // If fetch failed, try static computer user data, then gameData (if not 'Computer')
                if (!opponentDisplayName) {
                    const staticUserData = getComputerUserData(gameData.opponentId);
                    if (staticUserData) {
                        opponentDisplayName = formatDisplayName(
                            staticUserData.displayName,
                            staticUserData.discriminator,
                        );
                    } else if (
                        gameData.opponentDisplayName &&
                        gameData.opponentDisplayName !== 'Computer'
                    ) {
                        opponentDisplayName = gameData.opponentDisplayName;
                    } else {
                        opponentDisplayName = 'Unknown Computer';
                    }
                }
                const opponentAvatarKey =
                    opponentData.settings?.avatarKey ||
                    getComputerUserData(gameData.opponentId)?.avatarKey ||
                    gameData.opponentAvatarKey ||
                    'dolphin';

                games.push({
                    id: doc.id,
                    ...gameData,
                    opponentDisplayName,
                    opponentAvatarKey,
                    opponentType: 'computer',
                });
            } else {
                // Use snapshot data if available, otherwise fetch current data
                let opponentDisplayName = gameData.opponentDisplayName;
                let opponentAvatarKey = gameData.opponentAvatarKey;

                if (!opponentDisplayName || !opponentAvatarKey) {
                    // Fallback: fetch current data if snapshot doesn't exist (old games)
                    const opponentDoc = await db.collection('users').doc(gameData.opponentId).get();
                    const opponentData = opponentDoc.exists ? opponentDoc.data() : {};
                    opponentDisplayName =
                        formatDisplayName(opponentData.displayName, opponentData.discriminator) ||
                        'Opponent';
                    opponentAvatarKey = opponentData.settings?.avatarKey || 'dolphin';
                }

                games.push({
                    id: doc.id,
                    ...gameData,
                    opponentDisplayName,
                    opponentAvatarKey,
                    opponentType: 'pvp',
                });
            }
        }

        // Process opponent games (user is the opponent, so creator is their opponent)
        for (const doc of opponentGames.docs) {
            const gameData = doc.data();

            // For computer users, always fetch their display name to ensure correctness
            // For regular users, use snapshot data if available, otherwise fetch current data
            let opponentDisplayName = gameData.creatorDisplayName;
            let opponentAvatarKey = gameData.creatorAvatarKey;

            if (isComputerUser(gameData.creatorId)) {
                // Always fetch for computer users to ensure correct display name
                const creatorDoc = await db.collection('users').doc(gameData.creatorId).get();
                const creatorData = creatorDoc.exists ? creatorDoc.data() : {};
                // Never use 'Computer' as fallback for computer users - always fetch from user doc or use static data
                let fetchedDisplayName = formatDisplayName(
                    creatorData.displayName,
                    creatorData.discriminator,
                );
                // If fetch failed, try static computer user data, then gameData (if not 'Computer')
                if (!fetchedDisplayName) {
                    const staticUserData = getComputerUserData(gameData.creatorId);
                    if (staticUserData) {
                        fetchedDisplayName = formatDisplayName(
                            staticUserData.displayName,
                            staticUserData.discriminator,
                        );
                    } else if (
                        gameData.creatorDisplayName &&
                        gameData.creatorDisplayName !== 'Computer'
                    ) {
                        fetchedDisplayName = gameData.creatorDisplayName;
                    } else {
                        fetchedDisplayName = 'Unknown Computer';
                    }
                }
                opponentDisplayName = fetchedDisplayName;
                opponentAvatarKey =
                    creatorData.settings?.avatarKey ||
                    getComputerUserData(gameData.creatorId)?.avatarKey ||
                    gameData.creatorAvatarKey ||
                    'dolphin';
            } else if (!opponentDisplayName || !opponentAvatarKey) {
                // Fallback: fetch current data if snapshot doesn't exist (old games)
                const creatorDoc = await db.collection('users').doc(gameData.creatorId).get();
                const creatorData = creatorDoc.exists ? creatorDoc.data() : {};
                opponentDisplayName =
                    formatDisplayName(creatorData.displayName, creatorData.discriminator) ||
                    'Opponent';
                opponentAvatarKey = creatorData.settings?.avatarKey || 'dolphin';
            }

            games.push({
                id: doc.id,
                ...gameData,
                opponentDisplayName,
                opponentAvatarKey,
                opponentType: isComputerUser(gameData.creatorId) ? 'computer' : 'pvp',
            });
        }

        // Sort by most recently updated
        games.sort((a, b) => {
            const aTime = a.updatedAt?.toMillis() || 0;
            const bTime = b.updatedAt?.toMillis() || 0;
            return bTime - aTime;
        });

        return {
            success: true,
            games,
        };
    } catch (error) {
        console.error('Error getting active games:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Helper function to determine whose turn it is based on game type
 * Handles both PvP games (with whitePlayerId/blackPlayerId) and computer games
 */
function determineCurrentTurn(gameData, turn) {
    // For computer games, user is always white (creatorId)
    if (gameData.opponentId === 'computer') {
        return turn === 'w' ? gameData.creatorId : 'computer';
    }

    // For PvP games, use whitePlayerId/blackPlayerId if available
    if (gameData.whitePlayerId && gameData.blackPlayerId) {
        return turn === 'w' ? gameData.whitePlayerId : gameData.blackPlayerId;
    }

    // Fallback: shouldn't happen, but use current logic
    console.warn('Unable to determine currentTurn, missing player ID fields');
    return turn === 'w' ? gameData.creatorId : gameData.opponentId;
}
export { determineCurrentTurn }; // Export for testing

/**
 * Request to undo a move
 * POST /api/game/requestUndo
 */
export const requestUndo = onCall(getAppCheckConfig(), async (request) => {
    const { data, auth } = request;
    try {
        if (!auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId, moveCount = 2 } = data; // moveCount = how many moves to undo (default 2 for computer games)
        const userId = auth.uid;

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new HttpsError('permission-denied', 'Not a player in this game');
        }

        // Check if game is over
        if (gameData.status !== 'active') {
            throw new HttpsError('failed-precondition', 'Game is not active');
        }

        // Check if there are enough moves to undo
        const moveHistory = gameData.moves || [];
        if (moveHistory.length < moveCount) {
            throw new HttpsError(
                'failed-precondition',
                `Not enough moves to undo (have ${moveHistory.length}, need ${moveCount})`,
            );
        }

        // Handle computer game - auto-approve and undo immediately
        if (gameData.opponentId === 'computer') {
            // Load game state and undo moves
            const coralClash = new CoralClash();
            restoreGameFromSnapshot(coralClash, gameData.gameState);

            // Undo the specified number of moves
            for (let i = 0; i < moveCount; i++) {
                coralClash.undo();
            }

            // Create new game state
            const newGameState = createGameSnapshot(coralClash);

            // Determine whose turn it is after undo
            const nextTurn = determineCurrentTurn(gameData, newGameState.turn);

            // Cancel old timeout task before creating new one
            if (gameData.pendingTimeoutTask) {
                await cancelPendingTimeoutTask(gameId, gameData.pendingTimeoutTask);
            }

            const updateData = {
                gameState: newGameState,
                currentTurn: nextTurn,
                updatedAt: serverTimestamp(),
            };

            // Create new timeout task for the current player if time control is enabled
            if (gameData.timeControl?.totalSeconds && gameData.timeRemaining && nextTurn) {
                const nextPlayerTime = gameData.timeRemaining[nextTurn];
                if (nextPlayerTime && nextPlayerTime > 0) {
                    const taskName = await createTimeoutTask(gameId, nextPlayerTime);
                    if (taskName) {
                        updateData.pendingTimeoutTask = taskName;
                    }
                } else {
                    updateData.pendingTimeoutTask = null;
                }
            }

            // Update game document
            await db.collection('games').doc(gameId).update(updateData);

            return {
                success: true,
                message: 'Undo completed',
            };
        }

        // PvP game - request undo from opponent
        const opponentId = gameData.creatorId === userId ? gameData.opponentId : gameData.creatorId;

        // Set undo request status
        // Store the move number at which the undo was requested so we can dynamically
        // calculate how many moves to undo if more moves are made while request is pending
        await db.collection('games').doc(gameId).update({
            undoRequestedBy: userId,
            undoRequestMoveCount: moveCount,
            undoRequestAtMoveNumber: moveHistory.length,
            undoRequestStatus: 'pending',
            updatedAt: serverTimestamp(),
        });

        // Send notification to opponent
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};
        const userName = formatDisplayName(userData.displayName, userData.discriminator);

        await sendUndoRequestNotification(opponentId, userId, userName, gameId, moveCount).catch(
            (error) => console.error('Error sending undo request notification:', error),
        );

        return {
            success: true,
            message: 'Undo request sent to opponent',
        };
    } catch (error) {
        console.error('Error requesting undo:', error);
        throw new HttpsError('internal', error.message);
    }
});

/**
 * Respond to an undo request
 * POST /api/game/respondToUndoRequest
 */
export const respondToUndoRequest = onCall(getAppCheckConfig(), async (request) => {
    const { data, auth } = request;
    try {
        if (!auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId, approve } = data;
        const userId = auth.uid;

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify there's a pending undo request
        if (!gameData.undoRequestedBy || gameData.undoRequestStatus !== 'pending') {
            throw new HttpsError('failed-precondition', 'No pending undo request');
        }

        // Verify user is the opponent (not the requester), unless they're canceling
        // Allow requester to reject (cancel) their own request, but not approve it
        if (gameData.undoRequestedBy === userId && approve) {
            throw new HttpsError('permission-denied', 'Cannot approve your own undo request');
        }

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new HttpsError('permission-denied', 'Not a player in this game');
        }

        const requesterId = gameData.undoRequestedBy;
        const originalMoveCount = gameData.undoRequestMoveCount || 1;
        const undoRequestAtMoveNumber = gameData.undoRequestAtMoveNumber;

        if (approve) {
            // Undo approved - perform the undo
            const coralClash = new CoralClash();
            restoreGameFromSnapshot(coralClash, gameData.gameState);

            // Calculate dynamic move count using shared logic
            // This handles cases where moves were made after the undo request was sent
            const currentHistoryLength = coralClash.historyLength();
            let moveCount = calculateUndoMoveCount(
                originalMoveCount,
                undoRequestAtMoveNumber,
                currentHistoryLength,
            );

            // Ensure we don't try to undo more moves than exist
            moveCount = Math.min(moveCount, currentHistoryLength);

            // Undo the calculated number of moves
            for (let i = 0; i < moveCount; i++) {
                coralClash.undo();
            }

            // Create new game state
            const newGameState = createGameSnapshot(coralClash);

            // Determine whose turn it is after undo
            const nextTurn = determineCurrentTurn(gameData, newGameState.turn);

            // Cancel old timeout task before creating new one
            if (gameData.pendingTimeoutTask) {
                await cancelPendingTimeoutTask(gameId, gameData.pendingTimeoutTask);
            }

            const updateData = {
                gameState: newGameState,
                currentTurn: nextTurn,
                undoRequestedBy: null,
                undoRequestMoveCount: null,
                undoRequestAtMoveNumber: null,
                undoRequestStatus: null,
                updatedAt: serverTimestamp(),
            };

            // Create new timeout task for the current player if time control is enabled
            if (gameData.timeControl?.totalSeconds && gameData.timeRemaining && nextTurn) {
                const nextPlayerTime = gameData.timeRemaining[nextTurn];
                if (nextPlayerTime && nextPlayerTime > 0) {
                    const taskName = await createTimeoutTask(gameId, nextPlayerTime);
                    if (taskName) {
                        updateData.pendingTimeoutTask = taskName;
                    }
                } else {
                    updateData.pendingTimeoutTask = null;
                }
            }

            // Update game document - clear undo request and update state
            await db.collection('games').doc(gameId).update(updateData);

            // Send notification to requester
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const userName = formatDisplayName(userData.displayName, userData.discriminator);

            await sendUndoApprovedNotification(
                requesterId,
                userId,
                userName,
                gameId,
                moveCount,
            ).catch((error) => console.error('Error sending undo approved notification:', error));

            return {
                success: true,
                message: 'Undo approved',
            };
        } else {
            // Undo rejected - just clear the request
            await db.collection('games').doc(gameId).update({
                undoRequestedBy: null,
                undoRequestMoveCount: null,
                undoRequestAtMoveNumber: null,
                undoRequestStatus: null,
                updatedAt: serverTimestamp(),
            });

            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const userName = formatDisplayName(userData.displayName, userData.discriminator);

            if (requesterId === userId) {
                // User is cancelling their own request - notify the opponent
                const opponentId =
                    gameData.creatorId === userId ? gameData.opponentId : gameData.creatorId;
                await sendUndoCancelledNotification(opponentId, userId, userName, gameId).catch(
                    (error) => console.error('Error sending undo cancelled notification:', error),
                );
            } else {
                // Opponent is rejecting the request - notify the requester
                await sendUndoRejectedNotification(
                    requesterId,
                    userId,
                    userName,
                    gameId,
                    originalMoveCount,
                ).catch((error) =>
                    console.error('Error sending undo rejected notification:', error),
                );
            }

            return {
                success: true,
                message: requesterId === userId ? 'Undo request cancelled' : 'Undo rejected',
            };
        }
    } catch (error) {
        console.error('Error responding to undo request:', error);
        throw new HttpsError('internal', error.message);
    }
});
