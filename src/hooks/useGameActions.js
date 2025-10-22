import { useState, useCallback } from 'react';
import { Alert } from 'react-native';
import useFirebaseFunctions from './useFirebaseFunctions';

/**
 * Hook to handle game actions with backend-first approach
 * All actions are sent to backend first, then applied locally after validation
 *
 * @param {Object} coralClash - CoralClash game instance
 * @param {string} gameId - The game ID (null for local games)
 * @param {Function} onStateUpdate - Callback when game state changes
 */
export const useGameActions = (coralClash, gameId, onStateUpdate) => {
    const { makeMove: makeMoveAPI, resignGame: resignGameAPI } = useFirebaseFunctions();
    const [isProcessing, setIsProcessing] = useState(false);

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
                    Alert.alert('Invalid Move', error.message);
                    return null;
                }
            }

            // For online games, send to backend first
            setIsProcessing(true);
            try {
                console.log('Sending move to backend:', { gameId, moveParams });

                // Send to backend - backend will validate and update Firestore
                const result = await makeMoveAPI({ gameId, move: moveParams });

                console.log('Move result from backend:', result);

                // Backend validated the move, now apply it locally
                try {
                    const localMoveResult = coralClash.move(moveParams);
                    console.log('Move applied locally:', localMoveResult);

                    // Notify parent component of state change
                    onStateUpdate?.();

                    // If this is a computer game and computer made a move, apply it too
                    if (result.computerMove) {
                        console.log('Applying computer move:', result.computerMove);
                        // Computer move is already in the gameState returned by backend
                        // We could either:
                        // 1. Apply the computer move here
                        // 2. Wait for the notification/refresh to show it
                        // For now, let's apply it immediately for better UX
                        try {
                            const computerMoveResult = coralClash.move(result.computerMove.move);
                            console.log('Computer move applied locally:', computerMoveResult);
                            onStateUpdate?.();
                        } catch (error) {
                            console.error('Error applying computer move locally:', error);
                            // Not critical - user will see it on refresh
                        }
                    }

                    return localMoveResult;
                } catch (error) {
                    console.error('Error applying validated move locally:', error);
                    // This shouldn't happen since backend validated it
                    // But if it does, the game state is now inconsistent
                    Alert.alert(
                        'Sync Error',
                        'Move was accepted by server but failed to apply locally. Please refresh the game.',
                    );
                    return null;
                }
            } catch (error) {
                console.error('Error sending move to backend:', error);

                // Check if it's a validation error vs network error
                if (
                    error.message?.includes('Invalid move') ||
                    error.message?.includes('Not your turn')
                ) {
                    Alert.alert('Invalid Move', error.message);
                } else {
                    Alert.alert(
                        'Connection Error',
                        'Failed to send move to server. Please check your connection and try again.',
                    );
                }
                return null;
            } finally {
                setIsProcessing(false);
            }
        },
        [coralClash, gameId, makeMoveAPI, onStateUpdate],
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
            console.log('Sending resignation to backend:', { gameId });

            // Send to backend - backend will update Firestore
            await resignGameAPI({ gameId });

            console.log('Resignation accepted by backend');

            // Backend accepted, now apply locally
            const currentTurn = coralClash.turn();
            coralClash.resign(currentTurn);

            // Notify parent component
            onStateUpdate?.();

            return true;
        } catch (error) {
            console.error('Error sending resignation to backend:', error);
            Alert.alert('Error', 'Failed to resign. Please check your connection and try again.');
            return false;
        } finally {
            setIsProcessing(false);
        }
    }, [coralClash, gameId, resignGameAPI, onStateUpdate]);

    /**
     * Undo the last move - for local games only
     * Online games should not allow undo (or require opponent agreement)
     * @returns {Object|null} Undone move or null
     */
    const undoMove = useCallback(() => {
        if (!coralClash) {
            console.error('CoralClash instance not initialized');
            return null;
        }

        // Only allow undo for local games
        if (gameId) {
            Alert.alert('Undo Not Allowed', 'Cannot undo moves in online games.');
            return null;
        }

        const move = coralClash.undo();
        if (move) {
            onStateUpdate?.();
        }
        return move;
    }, [coralClash, gameId, onStateUpdate]);

    return {
        makeMove,
        resign,
        undoMove,
        isProcessing,
    };
};

export default useGameActions;
