const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { initializeGameState, serverTimestamp, increment } = require('../utils/helpers');
const { validateMove, getGameResult } = require('../utils/gameValidator');
const {
    sendGameRequestNotification,
    sendGameAcceptedNotification,
    sendOpponentMoveNotification,
} = require('../utils/notifications');

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

        const { gameId, move } = data;
        const userId = context.auth.uid;

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
        const currentFen = gameData.gameState?.fen || gameData.fen;
        const validation = validateMove(currentFen, move);

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
            timestamp: serverTimestamp(),
        });

        // Toggle turn (unless game is over)
        const nextTurn = validation.gameState.isGameOver
            ? null
            : gameData.currentTurn === gameData.creatorId
              ? gameData.opponentId
              : gameData.creatorId;

        // Check if game is over
        const gameResult = getGameResult(validation.newFen);

        // Update game with validated state
        const updateData = {
            moves,
            currentTurn: nextTurn,
            gameState: validation.gameState,
            fen: validation.newFen,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (gameResult.isOver) {
            updateData.status = 'completed';
            updateData.result = gameResult.result;
            updateData.resultReason = gameResult.reason;
            updateData.winner = gameResult.winner || null;
        }

        await db.collection('games').doc(gameId).update(updateData);

        // Check if this is a computer game and if computer should move
        const isComputerGame = gameData.opponentType === 'computer';
        let computerMoveResult = null;

        if (isComputerGame && !gameResult.isOver && nextTurn === 'computer') {
            // Computer's turn - make a move
            try {
                computerMoveResult = await makeComputerMove(gameId);
            } catch (error) {
                console.error('Error making computer move:', error);
                // Don't fail the user's move if computer move fails
            }
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
            await db.collection('notifications').add({
                userId: gameData.creatorId,
                type: 'game_over',
                gameId: gameId,
                result: gameResult,
                read: false,
                createdAt: serverTimestamp(),
            });
            await db.collection('notifications').add({
                userId: gameData.opponentId,
                type: 'game_over',
                gameId: gameId,
                result: gameResult,
                read: false,
                createdAt: serverTimestamp(),
            });

            // Update player stats
            if (gameResult.winner) {
                const winnerId =
                    gameResult.winner === 'w' ? gameData.creatorId : gameData.opponentId;
                const loserId =
                    gameResult.winner === 'w' ? gameData.opponentId : gameData.creatorId;

                await db
                    .collection('users')
                    .doc(winnerId)
                    .update({
                        'stats.gamesPlayed': increment(1),
                        'stats.gamesWon': increment(1),
                    });

                await db
                    .collection('users')
                    .doc(loserId)
                    .update({
                        'stats.gamesPlayed': increment(1),
                        'stats.gamesLost': increment(1),
                    });
            } else {
                // Draw
                await db
                    .collection('users')
                    .doc(gameData.creatorId)
                    .update({
                        'stats.gamesPlayed': increment(1),
                        'stats.gamesDraw': increment(1),
                    });

                await db
                    .collection('users')
                    .doc(gameData.opponentId)
                    .update({
                        'stats.gamesPlayed': increment(1),
                        'stats.gamesDraw': increment(1),
                    });
            }
        }

        return {
            success: true,
            message: 'Move made successfully',
            gameState: validation.gameState,
            gameOver: gameResult.isOver,
            result: gameResult.isOver ? gameResult : undefined,
            computerMove: computerMoveResult, // Include computer move if applicable
        };
    } catch (error) {
        console.error('Error making move:', error);
        throw new functions.https.HttpsError('internal', error.message);
    }
});

/**
 * Helper function to make a computer move
 * @param {string} gameId - The game ID
 * @returns {Promise<Object>} Computer move result
 */
async function makeComputerMove(gameId) {
    const gameDoc = await db.collection('games').doc(gameId).get();
    if (!gameDoc.exists) {
        throw new Error('Game not found');
    }

    const gameData = gameDoc.data();

    // Get current FEN from game state
    const currentFen = gameData.gameState?.fen || gameData.fen;

    // For now, we'll use simple random move selection
    // In the future, this could be enhanced with difficulty levels
    const { CoralClash } = require('../../shared/game/coralClash');
    const game = new CoralClash();
    game.load(currentFen, { skipValidation: false });

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

    // Validate the move
    const validation = validateMove(currentFen, {
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
        timestamp: serverTimestamp(),
    });

    // Toggle turn back to player
    const nextTurn = gameData.creatorId;

    // Check if game is over
    const gameResult = getGameResult(validation.newFen);

    // Update game with computer move
    const updateData = {
        moves: moves_array,
        currentTurn: gameResult.isOver ? null : nextTurn,
        gameState: validation.gameState,
        fen: validation.newFen,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
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
            // Get opponent info
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

        // Process opponent games
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
            // Get opponent info
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

        // Process opponent games
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
