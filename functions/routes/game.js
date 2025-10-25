const { onCall, onRequest, HttpsError } = require('firebase-functions/v2/https');
const admin = require('firebase-admin');
const {
    initializeGameState,
    serverTimestamp,
    increment,
    formatDisplayName,
} = require('../utils/helpers');
const { validateMove, getGameResult } = require('../utils/gameValidator');
const {
    sendGameRequestNotification,
    sendGameAcceptedNotification,
    sendOpponentMoveNotification,
} = require('../utils/notifications');
const { GAME_VERSION } = require('../shared/dist/game');

const db = admin.firestore();

/**
 * Validate game engine version
 * @param {string} clientVersion - Version from client
 * @throws {HttpsError} If version is invalid or unsupported
 */
function validateGameVersion(clientVersion) {
    // If no version provided, use current version (for backward compatibility)
    const version = clientVersion || GAME_VERSION;

    // Check if version is supported
    if (version !== GAME_VERSION) {
        throw new HttpsError(
            'failed-precondition',
            `Game version mismatch. Client: ${version}, Server: ${GAME_VERSION}. Please update your app.`,
        );
    }

    return version;
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

    const { opponentId, timeControl } = data;
    const creatorId = auth.uid;

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

    // Create game document with snapshot of player info
    const gameData = {
        creatorId,
        opponentId,
        whitePlayerId, // Randomly assigned
        blackPlayerId, // Randomly assigned
        status: 'pending', // pending, active, completed, cancelled
        currentTurn: whitePlayerId, // White always starts
        timeControl: timeControl || { type: 'unlimited' },
        moves: [],
        gameState: initializeGameState(),
        version: GAME_VERSION, // Store game engine version
        // Snapshot creator info at game creation
        creatorDisplayName: creatorName,
        creatorAvatarKey: creatorSettings.avatarKey || 'dolphin',
        // Snapshot opponent info at game creation
        opponentDisplayName: opponentName,
        opponentAvatarKey: opponentSettings.avatarKey || 'dolphin',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };

    const gameRef = await db.collection('games').add(gameData);

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

    return {
        success: true,
        gameId: gameRef.id,
        message: 'Game created successfully',
    };
}

/**
 * Create a new PvP game
 * POST /api/game/create
 */
exports.createGame = onCall(async (request) => {
    try {
        return await createGameHandler(request);
    } catch (error) {
        console.error('Error creating PvP game:', error);
        throw new HttpsError('internal', error.message);
    }
});
exports.createGameHandler = createGameHandler;

/**
 * Create a new game against the computer
 * POST /api/game/createComputer
 */
exports.createComputerGame = onCall(async (request) => {
    const { data, auth } = request;
    try {
        if (!auth) {
            throw new HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { timeControl, difficulty } = data;
        const userId = auth.uid;

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

        return {
            success: true,
            gameId: gameRef.id,
            message: 'Computer game created successfully',
        };
    } catch (error) {
        console.error('Error creating computer game:', error);
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
exports.respondToGameInvite = onCall(async (request) => {
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

        // Verify game is in pending status
        if (gameData.status !== 'pending') {
            throw new HttpsError('failed-precondition', 'Game is not in pending status');
        }

        // Authorization: Check if user is the recipient or sender
        const isRecipient = gameData.opponentId === userId;
        const isSender = gameData.creatorId === userId;

        if (!isRecipient && !isSender) {
            throw new HttpsError('permission-denied', 'Not authorized');
        }

        // Only recipient can accept (sender cannot accept their own request)
        if (accept && !isRecipient) {
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
        }

        // Update game status
        await db.collection('games').doc(gameId).update(updateData);

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
exports.makeMove = onCall(async (request) => {
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
        };

        // Update time tracking if enabled
        if (gameData.timeControl?.totalSeconds) {
            updateData.timeRemaining = updatedTimeRemaining;
            updateData.lastMoveTime = serverTimestamp();
        }

        if (gameResult.isOver) {
            updateData.status = 'completed';
            updateData.result = gameResult.result;
            updateData.resultReason = gameResult.reason;
            updateData.winner = gameResult.winner || null;
            updateData.pendingTimeoutTask = null; // Clear task reference
        }

        await db.collection('games').doc(gameId).update(updateData);

        // Cancel pending timeout task if game is over
        if (gameResult.isOver && gameData.pendingTimeoutTask) {
            await cancelPendingTimeoutTask(gameId, gameData.pendingTimeoutTask);
        }

        // Notify opponent (if game continues and not computer)
        if (!gameResult.isOver && nextTurn && nextTurn !== 'computer') {
            // Create notification document
            await db.collection('notifications').add({
                userId: nextTurn,
                type: 'move_made',
                gameId: gameId,
                from: userId,
                read: false,
                createdAt: serverTimestamp(),
            });

            // Send push notification
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

        console.log('[makeMove] Game state after move:', validation.gameState);
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
exports.makeComputerMove = onCall(async (request) => {
    const { data, auth } = request;
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
async function makeComputerMoveHelper(gameId, gameData = null) {
    if (!gameData) {
        const gameDoc = await db.collection('games').doc(gameId).get();
        if (!gameDoc.exists) {
            throw new Error('Game not found');
        }
        gameData = gameDoc.data();
    }

    // Get current game state (includes coral data)
    const currentGameState = gameData.gameState || { fen: gameData.fen };

    // For now, we'll use simple random move selection
    // In the future, this could be enhanced with difficulty levels
    const { CoralClash, restoreGameFromSnapshot } = require('../shared/dist/game');
    const game = new CoralClash();

    // Restore full game state including coral
    restoreGameFromSnapshot(game, currentGameState);

    // Get all legal moves
    const moves = game.moves({ verbose: true });
    if (moves.length === 0) {
        throw new Error('No legal moves available for computer');
    }

    // Select random move
    const selectedMove = moves[Math.floor(Math.random() * moves.length)];

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

    // Add computer move to moves array
    const moves_array = gameData.moves || [];
    moves_array.push({
        playerId: 'computer',
        move: validation.result,
        timestamp: new Date(),
    });

    // Toggle turn back to player
    const nextTurn = gameData.creatorId;

    // Check if game is over (use full game state, not just FEN)
    const gameResult = getGameResult(validation.gameState);

    // Update game with computer move
    const updateData = {
        moves: moves_array,
        currentTurn: gameResult.isOver ? null : nextTurn,
        gameState: validation.gameState,
        fen: validation.newFen,
        updatedAt: serverTimestamp(),
    };

    if (gameResult.isOver) {
        updateData.status = 'completed';
        updateData.result = gameResult.result;
        updateData.resultReason = gameResult.reason;
        updateData.winner = gameResult.winner || null;
        updateData.pendingTimeoutTask = null; // Clear task reference

        // Cancel pending timeout task
        if (gameData.pendingTimeoutTask) {
            await cancelPendingTimeoutTask(gameId, gameData.pendingTimeoutTask);
        }

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
        // Notify player that opponent made a move
        await sendOpponentMoveNotification(
            gameData.creatorId,
            gameId,
            'computer',
            'Computer',
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
 */
async function cancelPendingTimeoutTask(gameId, taskName) {
    // Skip in emulator
    if (process.env.FUNCTIONS_EMULATOR === 'true' || !taskName) {
        return;
    }

    try {
        const { CloudTasksClient } = require('@google-cloud/tasks');
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
exports.checkGameTime = onCall(async (request) => {
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
exports.handleTimeExpiration = onRequest(async (req, res) => {
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
});

/**
 * Resign from a game
 * POST /api/game/resign
 */
exports.resignGame = onCall(async (request) => {
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

        // Update game status
        await db
            .collection('games')
            .doc(gameId)
            .update({
                status: 'completed',
                result: winner === gameData.creatorId ? 'creator_wins' : 'opponent_wins',
                resultReason: 'resignation',
                winner: winner,
                gameState: updatedGameState,
                pendingTimeoutTask: null,
                updatedAt: serverTimestamp(),
            });
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
exports.requestGameReset = onCall(async (request) => {
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
            const { CoralClash } = require('../shared/dist/game');
            const { createGameSnapshot } = require('../shared/dist/game');

            const newGame = new CoralClash();
            const initialGameState = createGameSnapshot(newGame);

            await db.collection('games').doc(gameId).update({
                gameState: initialGameState,
                fen: newGame.fen(),
                moves: [],
                currentTurn: gameData.creatorId, // White always starts
                resetRequestedBy: null,
                resetRequestStatus: null,
                updatedAt: serverTimestamp(),
            });

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
exports.respondToResetRequest = onCall(async (request) => {
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
            const { CoralClash } = require('../shared/dist/game');
            const { createGameSnapshot } = require('../shared/dist/game');

            const newGame = new CoralClash();
            const initialGameState = createGameSnapshot(newGame);

            await db.collection('games').doc(gameId).update({
                gameState: initialGameState,
                fen: newGame.fen(),
                moves: [],
                currentTurn: gameData.creatorId, // White always starts
                resetRequestedBy: null,
                resetRequestStatus: 'approved',
                updatedAt: serverTimestamp(),
            });

            // Send push notification to requester
            const { sendResetApprovedNotification } = require('../utils/notifications');
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};
            const userName = formatDisplayName(userData.displayName, userData.discriminator);

            await sendResetApprovedNotification(requesterId, userId, userName, gameId).catch(
                (error) => console.error('Error sending reset approved notification:', error),
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
                const { sendResetCancelledNotification } = require('../utils/notifications');

                await sendResetCancelledNotification(opponentId, userId, userName, gameId).catch(
                    (error) => console.error('Error sending reset cancelled notification:', error),
                );
            } else {
                // Opponent is rejecting the request - notify the requester
                const { sendResetRejectedNotification } = require('../utils/notifications');

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
exports.getGameHistory = onCall(async (request) => {
    const { data, auth } = request;
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

            // Handle computer opponent
            if (gameData.opponentId === 'computer') {
                games.push({
                    id: doc.id,
                    ...gameData,
                    opponentDisplayName: 'Computer',
                    opponentAvatarKey: 'computer',
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
                });
            }
        }

        // Process opponent games (computer games won't be here since opponentId is 'computer')
        for (const doc of opponentGames.docs) {
            const gameData = doc.data();

            // Use snapshot data if available, otherwise fetch current data
            let opponentDisplayName = gameData.creatorDisplayName;
            let opponentAvatarKey = gameData.creatorAvatarKey;

            if (!opponentDisplayName || !opponentAvatarKey) {
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
exports.getActiveGames = onCall(async (request) => {
    const { data, auth } = request;
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
                games.push({
                    id: doc.id,
                    ...gameData,
                    opponentDisplayName: 'Computer',
                    opponentAvatarKey: 'computer',
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

            // Use snapshot data if available, otherwise fetch current data
            let opponentDisplayName = gameData.creatorDisplayName;
            let opponentAvatarKey = gameData.creatorAvatarKey;

            if (!opponentDisplayName || !opponentAvatarKey) {
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
                opponentType: 'pvp',
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
 * Request to undo a move
 * POST /api/game/requestUndo
 */
exports.requestUndo = onCall(async (request) => {
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
            const {
                CoralClash,
                restoreGameFromSnapshot,
                createGameSnapshot,
            } = require('../shared/dist/game');
            const coralClash = new CoralClash();
            restoreGameFromSnapshot(coralClash, gameData.gameState);

            // Undo the specified number of moves
            for (let i = 0; i < moveCount; i++) {
                coralClash.undo();
            }

            // Create new game state
            const newGameState = createGameSnapshot(coralClash);

            // Determine whose turn it is after undo
            // Use whitePlayerId/blackPlayerId since colors are randomly assigned
            const nextTurn =
                newGameState.turn === 'w' ? gameData.whitePlayerId : gameData.blackPlayerId;

            // Update game document
            await db.collection('games').doc(gameId).update({
                gameState: newGameState,
                currentTurn: nextTurn,
                updatedAt: serverTimestamp(),
            });

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
        const { sendUndoRequestNotification } = require('../utils/notifications');
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
exports.respondToUndoRequest = onCall(async (request) => {
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
            const {
                CoralClash,
                restoreGameFromSnapshot,
                createGameSnapshot,
                calculateUndoMoveCount,
            } = require('../shared/dist/game');
            const coralClash = new CoralClash();
            restoreGameFromSnapshot(coralClash, gameData.gameState);

            // Calculate dynamic move count using shared logic
            // This handles cases where moves were made after the undo request was sent
            const currentHistoryLength = coralClash.history().length;
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
            // Use whitePlayerId/blackPlayerId since colors are randomly assigned
            const nextTurn =
                newGameState.turn === 'w' ? gameData.whitePlayerId : gameData.blackPlayerId;

            // Update game document - clear undo request and update state
            await db.collection('games').doc(gameId).update({
                gameState: newGameState,
                currentTurn: nextTurn,
                undoRequestedBy: null,
                undoRequestMoveCount: null,
                undoRequestAtMoveNumber: null,
                undoRequestStatus: null,
                updatedAt: serverTimestamp(),
            });

            // Send notification to requester
            const { sendUndoApprovedNotification } = require('../utils/notifications');
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
                const { sendUndoCancelledNotification } = require('../utils/notifications');

                await sendUndoCancelledNotification(opponentId, userId, userName, gameId).catch(
                    (error) => console.error('Error sending undo cancelled notification:', error),
                );
            } else {
                // Opponent is rejecting the request - notify the requester
                const { sendUndoRejectedNotification } = require('../utils/notifications');

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
