const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { initializeGameState, serverTimestamp, increment } = require('../utils/helpers');
const { validateMove, getGameResult } = require('../utils/gameValidator');
const {
    sendGameRequestNotification,
    sendGameAcceptedNotification,
    sendOpponentMoveNotification,
} = require('../utils/notifications');
const { GAME_VERSION } = require('../../shared/dist/game');

const db = admin.firestore();

/**
 * Helper function to format display name with discriminator
 * @param {string} displayName - The user's display name
 * @param {string} discriminator - The 4-digit discriminator
 * @returns {string} Formatted name like "Username #1234"
 */
function formatDisplayName(displayName, discriminator) {
    if (!displayName) {
        return 'User';
    }
    if (!discriminator) {
        return displayName;
    }
    return `${displayName} #${discriminator}`;
}

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
        throw new functions.https.HttpsError(
            'failed-precondition',
            `Game version mismatch. Client: ${version}, Server: ${GAME_VERSION}. Please update your app.`,
        );
    }

    return version;
}

/**
 * Create a new PvP game
 * POST /api/game/create
 */
exports.createGame = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { opponentId, timeControl } = data;
        const creatorId = context.auth.uid;

        // Validate opponent exists
        const opponentDoc = await db.collection('users').doc(opponentId).get();
        if (!opponentDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Opponent not found');
        }

        // Create game document
        const gameData = {
            creatorId,
            opponentId,
            status: 'pending', // pending, active, completed, cancelled
            currentTurn: creatorId,
            timeControl: timeControl || { type: 'unlimited' },
            moves: [],
            gameState: initializeGameState(),
            version: GAME_VERSION, // Store game engine version
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

        // Get creator's info for push notification
        const creatorDoc = await db.collection('users').doc(creatorId).get();
        const creatorData = creatorDoc.data();
        const creatorName = formatDisplayName(creatorData.displayName, creatorData.discriminator);

        // Get opponent's info for response
        const opponentData = opponentDoc.data();

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
    } catch (error) {
        console.error('Error creating PvP game:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Create a new game against the computer
 * POST /api/game/createComputer
 */
exports.createComputerGame = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { timeControl, difficulty } = data;
        const userId = context.auth.uid;

        // Create game document with computer opponent
        const gameData = {
            creatorId: userId,
            opponentId: 'computer', // Special ID for computer opponent
            opponentType: 'computer',
            difficulty: difficulty || 'random', // 'random', 'easy', 'medium', 'hard'
            status: 'active', // Computer games start immediately
            currentTurn: userId, // User goes first (white)
            timeControl: timeControl || { type: 'unlimited' },
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
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Accept or decline a game invitation
 * POST /api/game/respond
 */
exports.respondToGameInvite = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId, accept } = data;
        const userId = context.auth.uid;

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify user is the opponent
        if (gameData.opponentId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not authorized');
        }

        // Update game status
        await db
            .collection('games')
            .doc(gameId)
            .update({
                status: accept ? 'active' : 'cancelled',
                updatedAt: serverTimestamp(),
            });

        // If accepted, notify the creator
        if (accept) {
            const accepterDoc = await db.collection('users').doc(userId).get();
            const accepterData = accepterDoc.data();
            const accepterName = formatDisplayName(
                accepterData.displayName,
                accepterData.discriminator,
            );

            // Send push notification to game creator
            sendGameAcceptedNotification(gameData.creatorId, userId, accepterName, gameId).catch(
                (error) => console.error('Error sending push notification:', error),
            );
        }

        return {
            success: true,
            message: accept ? 'Game started' : 'Game declined',
            gameId: gameId,
        };
    } catch (error) {
        console.error('Error responding to game invite:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Make a move in a PvP game
 * POST /api/game/move
 * Server-side move validation prevents cheating
 */
exports.makeMove = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId, move, version } = data;
        const userId = context.auth.uid;

        // Validate game version
        validateGameVersion(version);

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify it's the user's turn
        if (gameData.currentTurn !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not your turn');
        }

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not a player in this game');
        }

        // CRITICAL: Validate move using game engine to prevent cheating
        // Pass full game state (includes coral data) not just FEN
        const currentGameState = gameData.gameState || { fen: gameData.fen };
        const validation = validateMove(currentGameState, move);

        if (!validation.valid) {
            throw new functions.https.HttpsError(
                'invalid-argument',
                `Invalid move: ${validation.error}`,
            );
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
        const gameResult = getGameResult(validation.gameState);

        // Update game with validated state
        const updateData = {
            moves,
            currentTurn: nextTurn,
            gameState: validation.gameState,
            fen: validation.newFen,
            updatedAt: serverTimestamp(),
        };

        if (gameResult.isOver) {
            updateData.status = 'completed';
            updateData.result = gameResult.result;
            updateData.resultReason = gameResult.reason;
            updateData.winner = gameResult.winner || null;
        }

        await db.collection('games').doc(gameId).update(updateData);

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
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Make a computer move
 * POST /api/game/makeComputerMove
 * @param {string} gameId - The game ID
 */
exports.makeComputerMove = functions.https.onCall(async (data, context) => {
    try {
        const { gameId, version } = data;

        if (!gameId) {
            throw new functions.https.HttpsError('invalid-argument', 'Game ID is required');
        }

        // Validate game version
        validateGameVersion(version);

        const gameDoc = await db.collection('games').doc(gameId).get();
        if (!gameDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify this is a computer game
        if (gameData.opponentType !== 'computer') {
            throw new functions.https.HttpsError('failed-precondition', 'Not a computer game');
        }

        // Verify it's the computer's turn
        if (gameData.currentTurn !== 'computer') {
            throw new functions.https.HttpsError('failed-precondition', "Not the computer's turn");
        }

        // Verify game is not over
        if (gameData.status !== 'active') {
            throw new functions.https.HttpsError('failed-precondition', 'Game is not active');
        }

        const result = await makeComputerMoveHelper(gameId, gameData);

        return {
            success: true,
            message: 'Computer move made successfully',
            ...result,
        };
    } catch (error) {
        console.error('Error making computer move:', error);
        if (error instanceof functions.https.HttpsError) {
            throw error;
        }
        throw new functions.https.HttpsError('internal', error.message);
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
    const { CoralClash, restoreGameFromSnapshot } = require('../../shared/dist/game');
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
    });

    // Validate the move (pass full game state for proper validation)
    const validation = validateMove(currentGameState, {
        from: selectedMove.from,
        to: selectedMove.to,
        promotion: selectedMove.promotion,
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
 * Resign from a game
 * POST /api/game/resign
 */
exports.resignGame = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId } = data;
        const userId = context.auth.uid;

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not a player in this game');
        }

        // Check if game is already over
        if (gameData.status === 'completed' || gameData.status === 'cancelled') {
            throw new functions.https.HttpsError('failed-precondition', 'Game is already finished');
        }

        // Determine winner (opponent wins when user resigns)
        const winner = gameData.creatorId === userId ? gameData.opponentId : gameData.creatorId;

        // Update game status
        await db
            .collection('games')
            .doc(gameId)
            .update({
                status: 'completed',
                result: winner === gameData.creatorId ? 'creator_wins' : 'opponent_wins',
                resultReason: 'resignation',
                winner: winner,
                updatedAt: serverTimestamp(),
            });

        // Update stats for both players (skip if opponent is computer)
        if (gameData.opponentId !== 'computer') {
            // Winner gets a win
            await db
                .collection('users')
                .doc(winner)
                .update({
                    'stats.gamesPlayed': increment(1),
                    'stats.gamesWon': increment(1),
                });

            // Loser (user who resigned) gets a loss
            await db
                .collection('users')
                .doc(userId)
                .update({
                    'stats.gamesPlayed': increment(1),
                    'stats.gamesLost': increment(1),
                });
        } else {
            // Computer game - only update user stats
            await db
                .collection('users')
                .doc(userId)
                .update({
                    'stats.gamesPlayed': increment(1),
                    'stats.gamesLost': increment(1),
                });
        }

        return {
            success: true,
            message: 'Game resigned successfully',
            winner: winner,
        };
    } catch (error) {
        console.error('Error resigning game:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Request to reset a game
 * For computer games: Auto-approves and resets immediately
 * For PvP games: Sends request to opponent for approval
 */
exports.requestGameReset = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId } = data;
        const userId = context.auth.uid;

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not a player in this game');
        }

        // Check if game is already over
        if (gameData.status === 'completed' || gameData.status === 'cancelled') {
            throw new functions.https.HttpsError('failed-precondition', 'Game is already finished');
        }

        // Check if there's already a pending reset request
        if (gameData.resetRequestedBy) {
            throw new functions.https.HttpsError(
                'failed-precondition',
                'A reset request is already pending',
            );
        }

        const isComputerGame = gameData.opponentType === 'computer';

        if (isComputerGame) {
            // Computer game: Auto-approve and reset immediately
            const { CoralClash } = require('../../shared/dist/game');
            const { createGameSnapshot } = require('../../shared/dist/game');

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
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Respond to a game reset request (approve or reject)
 * Only for PvP games
 */
exports.respondToResetRequest = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId, approve } = data;
        const userId = context.auth.uid;

        if (typeof approve !== 'boolean') {
            throw new functions.https.HttpsError('invalid-argument', 'approve must be a boolean');
        }

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify user is the opponent (not the requester)
        if (!gameData.resetRequestedBy) {
            throw new functions.https.HttpsError('failed-precondition', 'No reset request pending');
        }

        if (gameData.resetRequestedBy === userId) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Cannot respond to your own reset request',
            );
        }

        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not a player in this game');
        }

        if (approve) {
            // Approved: Reset the game
            const { CoralClash } = require('../../shared/dist/game');
            const { createGameSnapshot } = require('../../shared/dist/game');

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

            // Notify the requester that reset was approved
            await db.collection('notifications').add({
                userId: gameData.resetRequestedBy,
                type: 'reset_approved',
                gameId: gameId,
                from: userId,
                read: false,
                createdAt: serverTimestamp(),
            });

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

            // Notify the requester that reset was rejected
            await db.collection('notifications').add({
                userId: gameData.resetRequestedBy,
                type: 'reset_rejected',
                gameId: gameId,
                from: userId,
                read: false,
                createdAt: serverTimestamp(),
            });

            return {
                success: true,
                message: 'Reset request rejected',
                approved: false,
            };
        }
    } catch (error) {
        console.error('Error responding to reset request:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get user's game history (completed and cancelled games)
 * GET /api/games/history
 */
exports.getGameHistory = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;

        // Get games where user is creator or opponent and status is completed or cancelled
        const creatorGames = await db
            .collection('games')
            .where('creatorId', '==', userId)
            .where('status', 'in', ['completed', 'cancelled'])
            .orderBy('updatedAt', 'desc')
            .limit(10)
            .get();

        const opponentGames = await db
            .collection('games')
            .where('opponentId', '==', userId)
            .where('status', 'in', ['completed', 'cancelled'])
            .orderBy('updatedAt', 'desc')
            .limit(10)
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
                });
            } else {
                // Get opponent info for human player
                const opponentDoc = await db.collection('users').doc(gameData.opponentId).get();
                const opponentData = opponentDoc.exists ? opponentDoc.data() : {};

                games.push({
                    id: doc.id,
                    ...gameData,
                    opponentDisplayName: formatDisplayName(
                        opponentData.displayName,
                        opponentData.discriminator,
                    ),
                    opponentAvatarKey: opponentData.settings?.avatarKey || 'dolphin',
                });
            }
        }

        // Process opponent games (computer games won't be here since opponentId is 'computer')
        for (const doc of opponentGames.docs) {
            const gameData = doc.data();
            // Get creator info (they are the opponent from user's perspective)
            const creatorDoc = await db.collection('users').doc(gameData.creatorId).get();
            const creatorData = creatorDoc.exists ? creatorDoc.data() : {};

            games.push({
                id: doc.id,
                ...gameData,
                opponentDisplayName: formatDisplayName(
                    creatorData.displayName,
                    creatorData.discriminator,
                ),
                opponentAvatarKey: creatorData.settings?.avatarKey || 'dolphin',
            });
        }

        // Sort by most recently updated and take top 5
        games.sort((a, b) => {
            const aTime = a.updatedAt?.toMillis() || 0;
            const bTime = b.updatedAt?.toMillis() || 0;
            return bTime - aTime;
        });

        return {
            success: true,
            games: games.slice(0, 5),
        };
    } catch (error) {
        console.error('Error getting game history:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Get user's active games
 * GET /api/games/active
 */
exports.getActiveGames = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const userId = context.auth.uid;

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
                });
            } else {
                // Get opponent info for human player
                const opponentDoc = await db.collection('users').doc(gameData.opponentId).get();
                const opponentData = opponentDoc.exists ? opponentDoc.data() : {};

                games.push({
                    id: doc.id,
                    ...gameData,
                    opponentDisplayName: formatDisplayName(
                        opponentData.displayName,
                        opponentData.discriminator,
                    ),
                    opponentAvatarKey: opponentData.settings?.avatarKey || 'dolphin',
                });
            }
        }

        // Process opponent games (computer games won't be here since opponentId is 'computer')
        for (const doc of opponentGames.docs) {
            const gameData = doc.data();
            // Get creator info (they are the opponent from user's perspective)
            const creatorDoc = await db.collection('users').doc(gameData.creatorId).get();
            const creatorData = creatorDoc.exists ? creatorDoc.data() : {};

            games.push({
                id: doc.id,
                ...gameData,
                opponentDisplayName: formatDisplayName(
                    creatorData.displayName,
                    creatorData.discriminator,
                ),
                opponentAvatarKey: creatorData.settings?.avatarKey || 'dolphin',
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
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Request to undo a move
 * POST /api/game/requestUndo
 */
exports.requestUndo = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId, moveCount = 2 } = data; // moveCount = how many moves to undo (default 2 for computer games)
        const userId = context.auth.uid;

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not a player in this game');
        }

        // Check if game is over
        if (gameData.status !== 'active') {
            throw new functions.https.HttpsError('failed-precondition', 'Game is not active');
        }

        // Check if there are enough moves to undo
        const moveHistory = gameData.moves || [];
        if (moveHistory.length < moveCount) {
            throw new functions.https.HttpsError(
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
            } = require('../../shared/dist/game');
            const coralClash = new CoralClash();
            restoreGameFromSnapshot(coralClash, gameData.gameState);

            // Undo the specified number of moves
            for (let i = 0; i < moveCount; i++) {
                coralClash.undo();
            }

            // Create new game state
            const newGameState = createGameSnapshot(coralClash);

            // Update game document
            await db.collection('games').doc(gameId).update({
                gameState: newGameState,
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
        await db.collection('games').doc(gameId).update({
            undoRequestedBy: userId,
            undoRequestMoveCount: moveCount,
            undoRequestStatus: 'pending',
            updatedAt: serverTimestamp(),
        });

        // Send notification to opponent
        const { sendNotification } = require('../utils/notifications');
        const userDoc = await db.collection('users').doc(userId).get();
        const userData = userDoc.exists ? userDoc.data() : {};

        await sendNotification({
            recipientId: opponentId,
            senderId: userId,
            senderDisplayName: formatDisplayName(userData.displayName, userData.discriminator),
            senderAvatarKey: userData.settings?.avatarKey || 'dolphin',
            type: 'undo_requested',
            data: {
                gameId,
                moveCount,
            },
        });

        return {
            success: true,
            message: 'Undo request sent to opponent',
        };
    } catch (error) {
        console.error('Error requesting undo:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Respond to an undo request
 * POST /api/game/respondToUndoRequest
 */
exports.respondToUndoRequest = functions.https.onCall(async (data, context) => {
    try {
        if (!context.auth) {
            throw new functions.https.HttpsError('unauthenticated', 'User must be authenticated');
        }

        const { gameId, approve } = data;
        const userId = context.auth.uid;

        const gameDoc = await db.collection('games').doc(gameId).get();

        if (!gameDoc.exists) {
            throw new functions.https.HttpsError('not-found', 'Game not found');
        }

        const gameData = gameDoc.data();

        // Verify there's a pending undo request
        if (!gameData.undoRequestedBy || gameData.undoRequestStatus !== 'pending') {
            throw new functions.https.HttpsError('failed-precondition', 'No pending undo request');
        }

        // Verify user is the opponent (not the requester)
        if (gameData.undoRequestedBy === userId) {
            throw new functions.https.HttpsError(
                'permission-denied',
                'Cannot respond to your own undo request',
            );
        }

        // Verify user is a player in this game
        if (gameData.creatorId !== userId && gameData.opponentId !== userId) {
            throw new functions.https.HttpsError('permission-denied', 'Not a player in this game');
        }

        const requesterId = gameData.undoRequestedBy;
        const moveCount = gameData.undoRequestMoveCount || 2;

        if (approve) {
            // Undo approved - perform the undo
            const {
                CoralClash,
                restoreGameFromSnapshot,
                createGameSnapshot,
            } = require('../../shared/dist/game');
            const coralClash = new CoralClash();
            restoreGameFromSnapshot(coralClash, gameData.gameState);

            // Undo the specified number of moves
            for (let i = 0; i < moveCount; i++) {
                coralClash.undo();
            }

            // Create new game state
            const newGameState = createGameSnapshot(coralClash);

            // Update game document - clear undo request and update state
            await db.collection('games').doc(gameId).update({
                gameState: newGameState,
                undoRequestedBy: null,
                undoRequestMoveCount: null,
                undoRequestStatus: null,
                updatedAt: serverTimestamp(),
            });

            // Send notification to requester
            const { sendNotification } = require('../utils/notifications');
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};

            await sendNotification({
                recipientId: requesterId,
                senderId: userId,
                senderDisplayName: formatDisplayName(userData.displayName, userData.discriminator),
                senderAvatarKey: userData.settings?.avatarKey || 'dolphin',
                type: 'undo_approved',
                data: {
                    gameId,
                    moveCount,
                },
            });

            return {
                success: true,
                message: 'Undo approved',
            };
        } else {
            // Undo rejected - just clear the request
            await db.collection('games').doc(gameId).update({
                undoRequestedBy: null,
                undoRequestMoveCount: null,
                undoRequestStatus: null,
                updatedAt: serverTimestamp(),
            });

            // Send notification to requester
            const { sendNotification } = require('../utils/notifications');
            const userDoc = await db.collection('users').doc(userId).get();
            const userData = userDoc.exists ? userDoc.data() : {};

            await sendNotification({
                recipientId: requesterId,
                senderId: userId,
                senderDisplayName: formatDisplayName(userData.displayName, userData.discriminator),
                senderAvatarKey: userData.settings?.avatarKey || 'dolphin',
                type: 'undo_rejected',
                data: {
                    gameId,
                    moveCount,
                },
            });

            return {
                success: true,
                message: 'Undo rejected',
            };
        }
    } catch (error) {
        console.error('Error responding to undo request:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});
