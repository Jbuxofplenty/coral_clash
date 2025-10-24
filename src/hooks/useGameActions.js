import { useState, useCallback, useEffect } from 'react';
import { Alert } from 'react-native';
import useFirebaseFunctions from './useFirebaseFunctions';
import useIsMounted from './useIsMounted';
import { db, doc, onSnapshot, getDoc } from '../config/firebase';
import { restoreGameFromSnapshot } from '../../shared';
import { useAuth, useAlert } from '../contexts';

/**
 * Hook to handle game actions with backend-first approach
 * All actions are sent to backend first, then applied locally after validation
 * Also manages real-time game state updates via Firestore listeners
 *
 * @param {Object} coralClash - CoralClash game instance
 * @param {string} gameId - The game ID (null for local games)
 * @param {Function} onStateUpdate - Callback when game state changes
 */
export const useGameActions = (coralClash, gameId, onStateUpdate) => {
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const {
        makeMove: makeMoveAPI,
        resignGame: resignGameAPI,
        requestUndo: requestUndoAPI,
    } = useFirebaseFunctions();
    const [isProcessing, setIsProcessing] = useState(false);
    const [gameData, setGameData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const isMountedRef = useIsMounted();

    // Real-time Firestore listener for game state updates
    // Centralized data management for all game-related state
    // Automatically unsubscribes when game reaches terminal state (optimization)
    useEffect(() => {
        if (!gameId || !user) {
            // Only update state if component is still mounted
            if (isMountedRef.current) {
                setIsLoading(false);
            }
            return; // Skip for offline games or when user is logged out
        }

        let hasUnsubscribed = false; // Flag to prevent multiple unsubscribe attempts

        // Subscribe to game document
        const unsubscribe = onSnapshot(
            doc(db, 'games', gameId),
            (docSnap) => {
                // Guard: Don't process if component is unmounted
                if (!isMountedRef.current) {
                    return;
                }

                if (docSnap.exists()) {
                    const data = docSnap.data();

                    if (isMountedRef.current) {
                        setGameData(data);
                    }

                    // Apply the updated game state to the CoralClash instance
                    if (data.gameState && coralClash) {
                        restoreGameFromSnapshot(coralClash, data.gameState);

                        // Only call onStateUpdate if component is still mounted
                        if (isMountedRef.current) {
                            onStateUpdate?.();
                        }
                    }

                    // Keep listener active even when game is over
                    // The component needs to receive the final state updates (like resignation)
                    // and display them properly. Unsubscribe only happens on component unmount.

                    if (isMountedRef.current) {
                        setIsLoading(false);
                    }
                } else {
                    console.error('Game document does not exist:', gameId);
                    if (isMountedRef.current) {
                        setIsLoading(false);
                    }
                }
            },
            (error) => {
                console.error('Error listening to game updates:', error);
                if (isMountedRef.current) {
                    setIsLoading(false);
                }
            },
        );

        // Cleanup subscription on unmount or gameId change
        return () => {
            if (!hasUnsubscribed) {
                unsubscribe();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, user]); // Depend on gameId and user; cleanup on logout

    /**
     * Make a move - sends to backend first, then applies locally
     * @param {Object} moveParams - Move parameters { from, to, promotion?, whaleSecondSquare?, coralPlaced?, coralRemoved?, coralRemovedSquares? }
     * @returns {Promise<Object|null>} Move result or null if failed
     */
    const makeMove = useCallback(
        async (moveParams) => {
            if (!coralClash) {
                console.error('CoralClash instance not initialized');
                return null;
            }

            // For local games (no gameId), just make the move directly
            if (!gameId) {
                try {
                    const moveResult = coralClash.move(moveParams);
                    if (moveResult) {
                        onStateUpdate?.();
                    }
                    return moveResult;
                } catch (error) {
                    console.error('Error making local move:', error);
                    showAlert('Invalid Move', error.message);
                    return null;
                }
            }

            // For online games, check if it's the user's turn before sending to backend
            if (!isUserTurn) {
                // Silently fail - user can still view moves but can't make them
                return null;
            }

            // For online games, send to backend first
            setIsProcessing(true);
            try {
                // Send to backend - backend will validate and update Firestore
                // The Firestore listener will automatically apply the move when it detects the change
                const result = await makeMoveAPI({ gameId, move: moveParams });

                // Don't apply the move locally - the Firestore listener handles that
                // This prevents double-move errors
                return result;
            } catch (error) {
                console.error('Error sending move to backend:', error);
                // Show alert for connection errors
                showAlert(
                    'Connection Error',
                    'Failed to send move to server. Please check your connection and try again.',
                );
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [coralClash, gameId, makeMoveAPI, onStateUpdate, isUserTurn, gameData, user, isMountedRef],
    );

    /**
     * Resign the game - sends to backend first, then applies locally
     * @returns {Promise<boolean>} Success status
     */
    const resign = useCallback(async () => {
        if (!coralClash) {
            console.error('CoralClash instance not initialized');
            return false;
        }

        // For local games, just resign directly
        if (!gameId) {
            const currentTurn = coralClash.turn();
            coralClash.resign(currentTurn);
            onStateUpdate?.();
            return true;
        }

        // For online games, send to backend first
        setIsProcessing(true);
        try {
            // Send to backend - backend will update Firestore
            await resignGameAPI({ gameId });

            // Don't apply locally - the Firestore listener handles that
            // This prevents inconsistencies and ensures backend state is the source of truth
            return true;
        } catch (error) {
            console.error('Error resigning game:', error);
            showAlert('Error', 'Failed to resign. Please check your connection and try again.');
            return false;
        } finally {
            setIsProcessing(false);
        }
    }, [coralClash, gameId, resignGameAPI, onStateUpdate, showAlert]);

    /**
     * Undo the last move
     * - For local games: Undo immediately
     * - For computer games: Request undo (auto-approved by backend)
     * - For PvP games: Send undo request to opponent
     * @param {number} moveCount - Number of moves to undo (default 1 for local, 2 for online)
     * @returns {Promise<Object|null>} Undone move or null
     */
    const undoMove = useCallback(
        async (moveCount = null) => {
            if (!coralClash) {
                console.error('CoralClash instance not initialized');
                return null;
            }

            // For local games, undo immediately
            if (!gameId) {
                const move = coralClash.undo();
                if (move) {
                    onStateUpdate?.();
                }
                return move;
            }

            // For online games (both PvP and computer), send request to backend
            // Default to undoing 2 moves for computer games (player + computer)
            // Default to undoing 1 move for PvP games
            const isComputerGame = gameData?.opponentId === 'computer';
            const defaultMoveCount = isComputerGame ? 2 : 1;
            const actualMoveCount = moveCount !== null ? moveCount : defaultMoveCount;

            setIsProcessing(true);
            try {
                const result = await requestUndoAPI({ gameId, moveCount: actualMoveCount });

                // For computer games, the backend auto-approves and the Firestore listener
                // will update the game state automatically

                // For PvP games, show a message that the request was sent
                if (!isComputerGame) {
                    showAlert(
                        'Undo Request Sent',
                        'Your undo request has been sent to your opponent.',
                    );
                }

                return result;
            } catch (error) {
                console.error('Error requesting undo:', error);
                showAlert('Error', 'Failed to send undo request. Please try again.');
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [coralClash, gameId, gameData, requestUndoAPI, onStateUpdate],
    );

    // Derived state from game data
    const opponentId = gameData
        ? user?.uid === gameData.creatorId
            ? gameData.opponentId
            : gameData.creatorId
        : null;

    const userColor = gameData
        ? user?.uid === gameData.whitePlayerId
            ? 'w'
            : user?.uid === gameData.blackPlayerId
              ? 'b'
              : null
        : null;

    const isUserTurn = gameData?.currentTurn === user?.uid;

    const opponentResigned =
        gameData?.gameState?.resigned &&
        gameData.gameState.resigned !== userColor &&
        gameData.gameState.resigned !== null;

    const userResigned =
        gameData?.gameState?.resigned &&
        gameData.gameState.resigned === userColor &&
        gameData.gameState.resigned !== null;

    const isGameOver = coralClash?.isGameOver() || false;

    const gameStatus = gameData?.status; // 'pending', 'active', 'completed', 'cancelled'

    return {
        // Actions
        makeMove,
        resign,
        undoMove,

        // State
        isProcessing,
        isLoading,
        gameData,

        // Derived state
        opponentId,
        userColor,
        isUserTurn,
        opponentResigned,
        userResigned,
        isGameOver,
        gameStatus,
    };
};

export default useGameActions;
