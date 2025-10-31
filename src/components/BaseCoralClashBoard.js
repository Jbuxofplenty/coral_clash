import { Icon } from 'galio-framework';
import { useCallback, useEffect, useState } from 'react';
import {
    Animated,
    Clipboard,
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import {
    CoralClash,
    WHALE,
    applyFixture,
    createGameSnapshot,
    restoreGameFromSnapshot,
} from '../../shared';
import { useAlert, useAuth, useGamePreferences, useTheme } from '../contexts';
import { useCoralClash, useFirebaseFunctions, useGameActions } from '../hooks';
import Coral from './Coral';
import EmptyBoard from './EmptyBoard';
import GameStatusBanner from './GameStatusBanner';
import Moves from './Moves';
import Pieces from './Pieces';
import PlayerStatusBar from './PlayerStatusBar';

const { height: _SCREEN_HEIGHT } = Dimensions.get('window');

// Game state schema version for fixtures
const GAME_STATE_VERSION = '1.2.0';

// Check if dev features are enabled
const DEV_FEATURES_ENABLED = process.env.EXPO_PUBLIC_ENABLE_DEV_FEATURES === 'true';

/**
 * BaseCoralClashBoard - Core game board component with all shared logic
 *
 * Props:
 * - fixture: Fixture data for dev mode
 * - gameId: Online game ID (null for offline)
 * - gameState: Initial game state
 * - opponentType: 'computer', 'passandplay', or undefined for PvP
 * - topPlayerData: { name, avatarKey, isComputer }
 * - bottomPlayerData: { name, avatarKey, isComputer }
 * - renderControls: Function to render control buttons
 * - renderMenuItems: Function to render menu drawer items
 * - onMoveComplete: Callback after a move is successfully made
 * - enableUndo: Boolean indicating if undo feature is enabled
 * - onUndo: Callback for undo action
 * - onResign: Optional callback after successful resign (for cleanup like storage)
 * - userColor: Color the current user is playing as ('w' or 'b', null for both/spectator)
 * - effectiveBoardFlip: Override for board flip (for PvP games where user plays as black)
 */
const BaseCoralClashBoard = ({
    fixture,
    gameId,
    gameState,
    opponentType,
    topPlayerData,
    bottomPlayerData,
    renderControls,
    renderMenuItems,
    renderGameRequestBanner,
    onMoveComplete,
    enableUndo = false,
    onUndo,
    onResign, // Optional callback after successful resign
    userColor = null,
    effectiveBoardFlip = null,
    notificationStatus = null,
}) => {
    const { width, height } = useWindowDimensions();
    const { colors } = useTheme();
    const { isBoardFlipped: contextBoardFlipped, toggleBoardFlip } = useGamePreferences();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const { checkGameTime } = useFirebaseFunctions();

    // Use compact mode on smaller screens (iPhone SE, etc.)
    const isCompact = height < 700;

    // Use effective board flip if provided, otherwise use context value
    const isBoardFlipped = effectiveBoardFlip !== null ? effectiveBoardFlip : contextBoardFlipped;
    const coralClash = useCoralClash();

    // Centralized game actions and state management
    const {
        makeMove: makeMoveAPI,
        resign: resignAPI,
        opponentResigned,
        userResigned,
        isUserTurn,
        gameData,
        isLoading: _gameActionsLoading,
        isProcessing: isGameActionProcessing,
    } = useGameActions(coralClash, gameId, () => forceUpdate((n) => n + 1));
    const [visibleMoves, setVisibleMoves] = useState([]);
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [whaleDestination, setWhaleDestination] = useState(null);
    const [whaleOrientationMoves, setWhaleOrientationMoves] = useState([]);
    const [isViewingEnemyMoves, setIsViewingEnemyMoves] = useState(false);
    const [fixtureLoaded, setFixtureLoaded] = useState(false);
    const [gameStateLoaded, setGameStateLoaded] = useState(false);
    const [updateCounter, forceUpdate] = useState(0);
    const [menuVisible, setMenuVisible] = useState(false);
    const [slideAnim] = useState(new Animated.Value(0));
    const [historyIndex, setHistoryIndex] = useState(null); // null = current state, 0+ = viewing history
    const [historicalBoard, setHistoricalBoard] = useState(null);
    const [historicalCoralClash, setHistoricalCoralClash] = useState(null); // Store historical game instance for coral
    const boardSize = Math.min(width, 400);

    // Time tracking state for local countdown
    const [localTimeRemaining, setLocalTimeRemaining] = useState(null);
    const [_lastUpdateTime, setLastUpdateTime] = useState(null);

    // Turn notification state (shows whose turn it is after a move)
    const [turnNotification, setTurnNotification] = useState(null);

    const openMenu = () => {
        setMenuVisible(true);
        Animated.spring(slideAnim, {
            toValue: 1,
            useNativeDriver: true,
            damping: 20,
            stiffness: 90,
        }).start();
    };

    const closeMenu = () => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 250,
            useNativeDriver: true,
        }).start(() => setMenuVisible(false));
    };

    // Load game state from active game if provided
    useEffect(() => {
        // Only restore if gameState has actual data (not empty object or null)
        const hasGameState = gameState && Object.keys(gameState).length > 0;

        if (hasGameState && !gameStateLoaded && !fixture) {
            try {
                restoreGameFromSnapshot(coralClash, gameState);
                setGameStateLoaded(true);
                forceUpdate((n) => n + 1);
            } catch (error) {
                console.error(`Failed to load game state on ${Platform.OS}:`, error);
                showAlert('Error', 'Failed to load game state');
            }
        }
    }, [gameState, gameStateLoaded, fixture, coralClash, width, showAlert]);

    // Load fixture if provided (for dev mode scenarios)
    useEffect(() => {
        if (fixture && !fixtureLoaded) {
            try {
                applyFixture(coralClash, fixture);
                setFixtureLoaded(true);
            } catch (error) {
                console.error('Failed to load fixture:', error);
                showAlert('Error', 'Failed to load game state');
            }
        }
    }, [fixture, fixtureLoaded, coralClash, showAlert]);

    // Firestore listener is now managed in useGameActions hook
    // No need for duplicate listener here

    // Handle offline computer moves (for offline games only)
    // Makes automatic black moves when it's black's turn in offline computer games
    useEffect(() => {
        // Only run for offline computer games
        if (gameId || opponentType !== 'computer') {
            return;
        }

        // Only run if not loading a fixture, or if fixture is loaded
        if (!fixture || fixtureLoaded) {
            // Make black moves if it's black's turn
            while (!coralClash.isGameOver() && coralClash.turn() === 'b') {
                const moves = coralClash.moves();
                const move = moves[Math.floor(Math.random() * moves.length)];
                coralClash.move(move);
            }
            // Force re-render to show the updated board
            forceUpdate((n) => n + 1);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [coralClash.history().length, fixture, fixtureLoaded, gameId, opponentType, coralClash]);

    // Clear selection state when board is flipped
    useEffect(() => {
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
        setIsViewingEnemyMoves(false);
    }, [isBoardFlipped]);

    // Clear turn notification when game ends or when viewing history
    useEffect(() => {
        if (coralClash.isGameOver() || gameData?.status === 'completed' || isViewingHistory) {
            setTurnNotification(null);
        }
    }, [coralClash, gameData?.status, isViewingHistory]);

    // Check game time on mount for online games with time control
    useEffect(() => {
        const checkTimeOnMount = async () => {
            if (!gameId || !gameData?.timeControl?.totalSeconds) {
                return;
            }

            try {
                await checkGameTime({ gameId });
            } catch (error) {
                console.error('Error checking game time on mount:', error);
            }
        };

        checkTimeOnMount();
        // Only run when gameId or timeControl changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gameId, gameData?.timeControl?.totalSeconds]);

    // Sync local time with server time when gameData updates
    // Calculate actual remaining time based on elapsed time since lastMoveTime
    useEffect(() => {
        if (
            gameData?.timeRemaining &&
            gameData?.timeControl?.totalSeconds &&
            gameData?.lastMoveTime &&
            gameData?.currentTurn
        ) {
            // Calculate elapsed time since last move
            const now = Date.now();
            const lastMoveTimestamp = gameData.lastMoveTime.toMillis
                ? gameData.lastMoveTime.toMillis()
                : gameData.lastMoveTime;
            const elapsedSeconds = Math.floor((now - lastMoveTimestamp) / 1000);

            // Calculate actual remaining time for current player
            const currentPlayerTime = gameData.timeRemaining[gameData.currentTurn];
            const actualCurrentPlayerTime = Math.max(0, currentPlayerTime - elapsedSeconds);

            // Set the corrected time
            const correctedTimeRemaining = {
                ...gameData.timeRemaining,
                [gameData.currentTurn]: actualCurrentPlayerTime,
            };

            setLocalTimeRemaining(correctedTimeRemaining);
            setLastUpdateTime(now);
        } else if (gameData?.timeRemaining && gameData?.timeControl?.totalSeconds) {
            // Fallback for unlimited or when game hasn't started
            setLocalTimeRemaining(gameData.timeRemaining);
            setLastUpdateTime(Date.now());
        }
    }, [
        gameData?.timeRemaining,
        gameData?.timeControl,
        gameData?.lastMoveTime,
        gameData?.currentTurn,
    ]);

    // Local countdown timer - decrement every second for active player
    useEffect(() => {
        // Stop timer if game is over or time control is not active
        if (
            !localTimeRemaining ||
            !gameData?.timeControl?.totalSeconds ||
            !gameData?.currentTurn ||
            gameData?.status === 'completed' ||
            coralClash?.isGameOver()
        ) {
            return;
        }

        const interval = setInterval(() => {
            setLocalTimeRemaining((prevTime) => {
                if (!prevTime || !gameData.currentTurn) return prevTime;

                const currentPlayerTime = prevTime[gameData.currentTurn];
                if (currentPlayerTime === undefined || currentPlayerTime <= 0) {
                    return prevTime;
                }

                return {
                    ...prevTime,
                    [gameData.currentTurn]: Math.max(0, currentPlayerTime - 1),
                };
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [
        localTimeRemaining,
        gameData?.timeControl,
        gameData?.currentTurn,
        gameData?.status,
        coralClash,
    ]);

    // Check for time expiration and notify server
    useEffect(() => {
        // Only check for online games with time control
        if (
            !gameId ||
            !localTimeRemaining ||
            !gameData?.timeControl?.totalSeconds ||
            !gameData?.currentTurn ||
            gameData?.status === 'completed'
        ) {
            return;
        }

        const currentPlayerTime = localTimeRemaining[gameData.currentTurn];

        // If current player's time has expired, notify server
        if (currentPlayerTime !== undefined && currentPlayerTime <= 0) {
            const reportTimeout = async () => {
                try {
                    await checkGameTime({ gameId });
                    // Server will update game status if time truly expired
                    // Firestore listener will update local state automatically
                } catch (error) {
                    console.error('Error reporting time expiration:', error);
                }
            };

            reportTimeout();
        }
    }, [
        localTimeRemaining,
        gameData?.currentTurn,
        gameData?.timeControl,
        gameData?.status,
        gameId,
        checkGameTime,
    ]);

    // Update historical board state when historyIndex changes
    useEffect(() => {
        if (historyIndex === null) {
            setHistoricalBoard(null);
            setHistoricalCoralClash(null);
            return;
        }

        try {
            // Create a new game instance and replay moves up to historyIndex
            const tempGame = new CoralClash();

            // Get the move history
            const moveHistory = coralClash.history({ verbose: true });

            // Replay moves up to the historyIndex
            for (let i = 0; i <= historyIndex && i < moveHistory.length; i++) {
                const move = moveHistory[i];
                tempGame.move(move);
            }

            // Store both the board state and the game instance (for coral state)
            setHistoricalBoard(tempGame.board());
            setHistoricalCoralClash(tempGame);
        } catch (error) {
            console.error('Error creating historical board state:', error);
            setHistoryIndex(null);
            setHistoricalBoard(null);
            setHistoricalCoralClash(null);
        }
    }, [historyIndex, coralClash]);

    // Compute if we're viewing history
    const isViewingHistory = historyIndex !== null;
    const currentHistoryLength = coralClash.history().length;

    // History navigation functions
    // canGoBack: true if there are moves and we're either at current state or not at starting position
    const canGoBack = currentHistoryLength > 0 && (historyIndex === null || historyIndex >= 0);
    // canGoForward: true if we're viewing history (not at current state)
    const canGoForward = historyIndex !== null;

    const handleHistoryBack = () => {
        if (!canGoBack) return;

        if (historyIndex === null) {
            // Start viewing history from one move back
            // If length is 1, go to -1 (starting position)
            // If length is 2+, go to length - 2 (one move back from current)
            setHistoryIndex(currentHistoryLength - 2);
        } else if (historyIndex >= 0) {
            // Go back one more move (can go to -1 for starting position)
            setHistoryIndex(historyIndex - 1);
        }

        // Clear selection state
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
        setIsViewingEnemyMoves(false);
    };

    const handleHistoryForward = () => {
        if (!canGoForward) return;

        if (historyIndex >= currentHistoryLength - 2) {
            // We're at or near the end, go to current state
            setHistoryIndex(null);
        } else {
            // Go forward one move
            setHistoryIndex(historyIndex + 1);
        }

        // Clear selection state
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
        setIsViewingEnemyMoves(false);
    };

    // Get game status message with type for unified banner styling
    const getGameStatus = () => {
        // Priority 0: Check for timeout from server (for online games)
        if (gameData?.resultReason === 'timeout' && gameData?.status === 'completed') {
            const winner = gameData.winner;
            if (userColor && user) {
                const didUserWin = winner === user.uid;

                if (didUserWin) {
                    let opponentName = 'Opponent';
                    if (opponentType === 'computer') {
                        opponentName = 'Computer';
                    } else if (userColor === 'w') {
                        opponentName = topPlayerData?.name || 'Opponent';
                    } else {
                        opponentName = bottomPlayerData?.name || 'Opponent';
                    }
                    return {
                        message: `You won! ${opponentName} ran out of time ⏱️`,
                        type: 'timeout_win',
                    };
                } else {
                    return {
                        message: `You lost! Time expired ⏱️`,
                        type: 'timeout_lose',
                    };
                }
            } else {
                // Offline or spectator mode
                const loserColor = gameData.result === 'win' ? 'b' : 'w';
                const loserName = loserColor === 'w' ? 'White' : 'Black';
                return {
                    message: `${loserName} ran out of time! ⏱️`,
                    type: 'timeout_lose',
                };
            }
        }

        // Priority 1: Check real-time resignation status from Firestore (for online games)
        // This ensures immediate display when opponent resigns
        if (opponentResigned) {
            // Determine opponent name - find the player who is not the computer (for computer games)
            // or whose color doesn't match userColor (for PvP games)
            let opponentName = 'Opponent';
            if (opponentType === 'computer') {
                // For computer games, opponent is always "Computer" regardless of board flip
                opponentName = 'Computer';
            } else if (topPlayerData?.isComputer) {
                opponentName = 'Computer';
            } else if (bottomPlayerData?.isComputer) {
                opponentName = 'Computer';
            } else if (userColor === 'w') {
                // For PvP: if user is white, opponent is black (on top when not flipped)
                opponentName = topPlayerData?.name || 'Opponent';
            } else {
                // For PvP: if user is black, opponent is white (on bottom when not flipped)
                opponentName = bottomPlayerData?.name || 'Opponent';
            }
            return {
                message: `You won! ${opponentName} resigned 🏳️`,
                type: 'win',
            };
        }

        if (userResigned) {
            return {
                message: 'You resigned 🏳️',
                type: 'resign',
            };
        }

        // Priority 2: Check checkmate
        if (coralClash.isCheckmate()) {
            const winnerColor = coralClash.turn() === 'w' ? 'b' : 'w';
            if (userColor) {
                // Personalized message for PvP games
                const didUserWin = winnerColor === userColor;
                return {
                    message: didUserWin ? 'Checkmate! You won! 🏆' : 'Checkmate! You lost.',
                    type: didUserWin ? 'win' : 'lose',
                };
            } else {
                // Generic message for offline games
                const winner = winnerColor === 'w' ? 'White' : 'Black';
                return { message: `Checkmate! ${winner} wins! 🏆`, type: 'win' };
            }
        }

        // Priority 3: Check local resignation (for offline games or fallback)
        const resigned = coralClash.isResigned();
        if (resigned) {
            const winnerColor = resigned === 'w' ? 'b' : 'w';
            if (userColor) {
                // Personalized message for PvP games
                const didUserWin = winnerColor === userColor;
                const didUserResign = resigned === userColor;
                if (didUserWin) {
                    // Determine opponent name - find the computer or the other player
                    let opponentName = 'Opponent';
                    if (opponentType === 'computer') {
                        opponentName = 'Computer';
                    } else if (topPlayerData?.isComputer) {
                        opponentName = 'Computer';
                    } else if (bottomPlayerData?.isComputer) {
                        opponentName = 'Computer';
                    } else if (userColor === 'w') {
                        opponentName = topPlayerData?.name || 'Opponent';
                    } else {
                        opponentName = bottomPlayerData?.name || 'Opponent';
                    }
                    return {
                        message: `You won! ${opponentName} resigned 🏳️`,
                        type: 'win',
                    };
                } else {
                    return {
                        message: didUserResign ? 'You resigned 🏳️' : 'You lost',
                        type: didUserResign ? 'resign' : 'lose',
                    };
                }
            } else {
                // Generic message for offline games
                const winner = winnerColor === 'w' ? 'White' : 'Black';
                return { message: `${winner} wins by resignation! 🏳️`, type: 'resign' };
            }
        }

        const coralWinner = coralClash.isCoralVictory();
        if (coralWinner) {
            const winner = coralWinner === 'w' ? 'White' : 'Black';
            const whiteScore = coralClash.getCoralAreaControl('w');
            const blackScore = coralClash.getCoralAreaControl('b');
            if (userColor) {
                const didUserWin = coralWinner === userColor;
                return {
                    message: didUserWin
                        ? `You won by Coral Victory! 🪸\n${whiteScore} - ${blackScore}`
                        : `You lost. ${winner} wins by Coral Victory! 🪸\n${whiteScore} - ${blackScore}`,
                    type: didUserWin ? 'win' : 'lose',
                };
            }
            return {
                message: `${winner} wins by Coral Victory! 🪸\n${whiteScore} White - ${blackScore} Black`,
                type: 'win',
            };
        }

        if (coralClash.isStalemate()) {
            return { message: 'Stalemate! 🤝', type: 'draw' };
        }

        // Check for threefold repetition explicitly before other draw conditions
        if (coralClash.isThreefoldRepetition()) {
            return { message: 'Draw by Repetition! 🤝', type: 'draw' };
        }

        // Check for insufficient material
        if (coralClash.isInsufficientMaterial()) {
            return { message: 'Draw - Insufficient Material! 🤝', type: 'draw' };
        }

        // Check for coral tie (must check _shouldTriggerCoralScoring directly, not isDraw)
        const shouldTriggerCoral =
            coralClash.getCoralRemaining('w') === 0 ||
            coralClash.getCoralRemaining('b') === 0 ||
            // Check if crab/octopus reached back row
            (() => {
                const board = coralClash.board();
                // Check rank 8 (index 0) for white pieces
                const whiteReachedEnd = board[0].some(
                    (sq) => sq && sq.color === 'w' && (sq.type === 'c' || sq.type === 'o'),
                );
                // Check rank 1 (index 7) for black pieces
                const blackReachedEnd = board[7].some(
                    (sq) => sq && sq.color === 'b' && (sq.type === 'c' || sq.type === 'o'),
                );
                return whiteReachedEnd || blackReachedEnd;
            })();

        if (shouldTriggerCoral && coralWinner === null) {
            const score = coralClash.getCoralAreaControl('w');
            return {
                message: `Draw - Coral Tie! 🤝🪸\n${score} - ${score}`,
                type: 'draw',
            };
        }

        // Generic draw (50-move rule)
        if (coralClash.isDraw()) {
            return { message: 'Draw! 🤝', type: 'draw' };
        }

        if (coralClash.inCheck()) {
            const player = coralClash.turn() === 'w' ? 'White' : 'Black';
            return { message: `${player} is in Check! ⚠️`, type: 'check' };
        }

        return null;
    };

    const gameStatus = getGameStatus();

    // Compute if undo is actually available based on enableUndo prop and game state
    const historyLength = coralClash.history().length;
    // Check both local game engine state AND server-side completion status (e.g., timeout)
    const isGameOver = coralClash.isGameOver() || gameData?.status === 'completed';
    const canUndo = enableUndo && historyLength >= 2 && !isGameOver;

    // Calculate if it's the player's turn (stable calculation, not inline in JSX)
    // For online games, use server's turn state (isUserTurn from gameData)
    // For local/offline games, use local game engine's turn state
    const isOnlineGame = gameId && !gameId.startsWith('local_');
    const isPlayerTurn = isOnlineGame
        ? isUserTurn
        : userColor && coralClash
          ? coralClash.turn() === userColor
          : true; // For pass-and-play (userColor is null) or if coralClash not ready, both players can move

    const handleUndo = () => {
        // Clear visible moves immediately to prevent showing invalidated moves
        clearVisibleMoves();

        if (onUndo) {
            onUndo(coralClash);
            // Exit history view when undo is performed
            setHistoryIndex(null);
            // Force re-render to show updated board after undo
            forceUpdate((n) => n + 1);
        }
    };

    const handleResign = async () => {
        if (isGameActionProcessing) {
            return;
        }

        closeMenu();

        // Wait for menu animation to complete before showing alert
        await new Promise((resolve) => setTimeout(resolve, 300));

        showAlert('Resign Game', 'Are you sure you want to resign? You will lose the game.', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Resign',
                style: 'destructive',
                onPress: async () => {
                    const success = await resignAPI();
                    if (success) {
                        clearVisibleMoves();

                        // Call optional resign callback for cleanup (e.g., pass-and-play storage)
                        if (onResign) {
                            await onResign();
                        }
                    }
                },
            },
        ]);
    };

    // Show turn notification after a move
    // Helper function to clear visible moves and selection state
    const clearVisibleMoves = useCallback(() => {
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
        setIsViewingEnemyMoves(false);
    }, []);

    const showTurnNotification = useCallback(() => {
        if (!coralClash || typeof coralClash.turn !== 'function') {
            console.warn('CoralClash instance not ready for turn notification');
            return;
        }

        const currentTurn = coralClash.turn();
        const currentPlayerColor = currentTurn === 'w' ? 'White' : 'Black';

        // Determine whose turn it is based on game type
        let message;
        if (userColor) {
            // For games where user has a specific color (PvP or computer)
            const isUsersTurn = currentTurn === userColor;
            if (isUsersTurn) {
                message = 'Your turn';
            } else if (opponentType === 'computer') {
                message = "Computer's turn";
            } else {
                // Get opponent name from player data
                const opponentData = userColor === 'w' ? topPlayerData : bottomPlayerData;
                const opponentName = opponentData?.name || 'Opponent';
                message = `${opponentName}'s turn`;
            }
        } else {
            // For pass-and-play or offline games
            message = `${currentPlayerColor}'s turn`;
        }

        setTurnNotification({
            message,
            type: 'info',
            timeout: 2500,
            onDismiss: () => setTurnNotification(null),
        });
    }, [coralClash, userColor, opponentType, topPlayerData, bottomPlayerData]);

    // Execute a move - for online games, use backend-first; for offline/local, apply locally
    const executeMove = async (moveParams) => {
        // Online game: backend-first approach
        if (isOnlineGame) {
            const result = await makeMoveAPI(moveParams);
            if (!result) return null;

            setHistoryIndex(null);
            await onMoveComplete?.(result, moveParams);

            // Show turn notification if game is not over
            if (!result.gameOver && !coralClash.isGameOver()) {
                showTurnNotification();
            }

            return result;
        }

        // Offline/local game: apply locally
        const moveResult = coralClash.move(moveParams);
        if (!moveResult) return null;

        setHistoryIndex(null);
        forceUpdate((n) => n + 1);

        // Get game state immediately after the move
        const currentGameState = createGameSnapshot(coralClash);
        const isGameOverNow = coralClash.isGameOver();

        await onMoveComplete?.(
            {
                success: true,
                gameState: currentGameState,
                gameOver: isGameOverNow,
                opponentType,
            },
            moveParams,
        );

        // Show turn notification if game is not over
        if (!isGameOverNow) {
            showTurnNotification();
        }

        return moveResult;
    };

    // executeResign function removed - now using resignAPI from useGameActions hook

    const handleSelectPiece = (square) => {
        // Disable interaction when viewing history, game is over, or processing a move
        if (isGameOver || isViewingHistory || isGameActionProcessing) {
            return;
        }

        // Clear enemy moves when clicking anywhere on the board while viewing them
        if (isViewingEnemyMoves) {
            setVisibleMoves([]);
            setSelectedSquare(null);
            setWhaleDestination(null);
            setWhaleOrientationMoves([]);
            setIsViewingEnemyMoves(false);
            return;
        }

        // If whale destination is set and user clicks on a square, treat it as orientation selection
        if (whaleDestination) {
            // Check if this square is one of the orientation options by looking in whaleOrientationMoves
            // Find the original move where to === whaleDestination and whaleSecondSquare === clicked square
            const orientationMove = whaleOrientationMoves.find(
                (m) => m.to === whaleDestination && m.whaleSecondSquare === square,
            );

            if (orientationMove) {
                // Treat this as a move selection, not a piece selection
                // Pass a move object that handleSelectMove expects: with 'to' set to the clicked square
                // so that move.to in handleSelectMove matches the whaleSecondSquare we want
                handleSelectMove({
                    ...orientationMove,
                    to: square, // This is the key: move.to will be the whaleSecondSquare for the lookup
                });
                return;
            }
        }

        const piece = coralClash.get(square);
        const currentTurn = coralClash.turn();
        // For online games (PvP or computer), check against userColor
        // For offline games, check against currentTurn
        const isEnemyPiece = piece && piece.color !== (userColor || currentTurn);

        if (piece && piece.type === WHALE) {
            const whaleColor = piece.color;
            const allMoves = coralClash.moves({ verbose: true, color: whaleColor });
            const whaleMoves = allMoves.filter((m) => m.piece === WHALE);

            const allDestinations = new Set();
            whaleMoves.forEach((move) => {
                allDestinations.add(move.to);
            });

            const destinationMoves = Array.from(allDestinations).map((dest) => {
                return whaleMoves.find((m) => m.to === dest);
            });

            setVisibleMoves(destinationMoves);
            setSelectedSquare(isEnemyPiece ? null : square);
            setWhaleDestination(null);
            setWhaleOrientationMoves([]);
            setIsViewingEnemyMoves(isEnemyPiece);
        } else if (piece) {
            const moves = coralClash.moves({ square: square, verbose: true, color: piece.color });
            setVisibleMoves(moves);
            setSelectedSquare(isEnemyPiece ? null : square);
            setWhaleDestination(null);
            setWhaleOrientationMoves([]);
            setIsViewingEnemyMoves(isEnemyPiece);
        } else {
            setVisibleMoves([]);
            setSelectedSquare(null);
            setWhaleDestination(null);
            setWhaleOrientationMoves([]);
            setIsViewingEnemyMoves(false);
        }
    };

    const handleSelectMove = async (move) => {
        if (coralClash.isGameOver() || isGameActionProcessing) {
            return;
        }

        // Clear enemy moves when clicking on move indicators while viewing them
        if (isViewingEnemyMoves) {
            setVisibleMoves([]);
            setSelectedSquare(null);
            setWhaleDestination(null);
            setWhaleOrientationMoves([]);
            setIsViewingEnemyMoves(false);
            return;
        }

        const piece = coralClash.get(selectedSquare || move.from);

        // Check if this is a whale move and we haven't selected the first square yet
        if (piece && piece.type === WHALE && !whaleDestination) {
            const allMoves = coralClash.moves({ verbose: true });
            const whaleColor = piece.color.toLowerCase();
            const movesToThisSquare = allMoves.filter(
                (m) =>
                    m.to === move.to && m.piece === WHALE && m.color.toLowerCase() === whaleColor,
            );

            if (movesToThisSquare.length > 0) {
                const orientationMap = new Map();

                movesToThisSquare.forEach((m) => {
                    if (m.whaleSecondSquare && !orientationMap.has(m.whaleSecondSquare)) {
                        orientationMap.set(m.whaleSecondSquare, m);
                    }
                });

                if (orientationMap.size === 1) {
                    const onlyMove = Array.from(orientationMap.values())[0];
                    await executeMove({ from: onlyMove.from, to: onlyMove.to });
                    setSelectedSquare(null);
                    setVisibleMoves([]);
                    setWhaleDestination(null);
                    setWhaleOrientationMoves([]);
                    return;
                }

                setWhaleDestination(move.to);
                setWhaleOrientationMoves(movesToThisSquare);

                const orientationMoves = Array.from(orientationMap.values()).map((m) => {
                    return {
                        ...m,
                        to: m.whaleSecondSquare,
                        isOrientationOption: true,
                    };
                });

                const destinationSquareMove = {
                    ...movesToThisSquare[0],
                    to: move.to,
                    isDestinationMarker: true,
                };

                setVisibleMoves([destinationSquareMove, ...orientationMoves]);
                return;
            } else {
                console.error('No whale moves found to square:', move.to);
                return;
            }
        } else if (whaleDestination) {
            const selectedMove = whaleOrientationMoves.find((m) => {
                return m.to === whaleDestination && m.whaleSecondSquare === move.to;
            });

            if (selectedMove) {
                const allOrientationMoves = whaleOrientationMoves.filter(
                    (m) =>
                        m.to === selectedMove.to &&
                        m.whaleSecondSquare === selectedMove.whaleSecondSquare,
                );

                if (allOrientationMoves.length > 1) {
                    const coralOptions = allOrientationMoves.map((m) => ({
                        move: m,
                        squares: m.coralRemovedSquares || [],
                    }));

                    const alertButtons = coralOptions.map((option) => {
                        let label = '';
                        if (option.squares.length === 0) {
                            label = "Don't remove";
                        } else if (option.squares.length === 1) {
                            label = `Remove from ${option.squares[0]}`;
                        } else {
                            label = `Remove from both (${option.squares.join(', ')})`;
                        }

                        return {
                            text: label,
                            onPress: async () => {
                                await executeMove({
                                    from: option.move.from,
                                    to: option.move.to,
                                    whaleSecondSquare: option.move.whaleSecondSquare,
                                    coralRemovedSquares: option.squares,
                                    ...(option.move.promotion && { promotion: 'q' }),
                                });
                                setVisibleMoves([]);
                                setSelectedSquare(null);
                                setWhaleDestination(null);
                                setWhaleOrientationMoves([]);
                            },
                        };
                    });

                    showAlert(
                        'Hunter Effect (Whale)',
                        'Choose coral removal option:',
                        alertButtons,
                        true, // vertical layout
                    );
                    return;
                } else {
                    console.log('[DEBUG] Single move - executing directly:', {
                        from: selectedMove.from,
                        to: selectedMove.to,
                        whaleSecondSquare: selectedMove.whaleSecondSquare,
                    });
                    await executeMove({
                        from: selectedMove.from,
                        to: selectedMove.to,
                        whaleSecondSquare: selectedMove.whaleSecondSquare,
                        ...(selectedMove.promotion && { promotion: 'q' }),
                    });
                    setVisibleMoves([]);
                    setSelectedSquare(null);
                    setWhaleDestination(null);
                    setWhaleOrientationMoves([]);
                    return;
                }
            } else {
                return;
            }
        }

        if (piece && piece.type === WHALE) {
            return;
        }

        // Check if there are coral action options for this move
        const allMoves = coralClash.moves({ verbose: true });
        const movesToThisSquare = allMoves.filter((m) => m.from === move.from && m.to === move.to);

        if (movesToThisSquare.length > 1) {
            const hasCoralPlaced = movesToThisSquare.some((m) => m.coralPlaced === true);
            const hasCoralRemoved = movesToThisSquare.some((m) => m.coralRemoved === true);

            if (hasCoralPlaced) {
                showAlert('Gatherer Effect', 'Place coral on this square?', [
                    {
                        text: 'No',
                        onPress: async () => {
                            const moveWithoutCoral = movesToThisSquare.find(
                                (m) => m.coralPlaced === false,
                            );
                            if (moveWithoutCoral) {
                                await executeMove({
                                    from: moveWithoutCoral.from,
                                    to: moveWithoutCoral.to,
                                    coralPlaced: false,
                                    ...(moveWithoutCoral.promotion && { promotion: 'q' }),
                                });
                                setVisibleMoves([]);
                                setSelectedSquare(null);
                                setWhaleDestination(null);
                                setWhaleOrientationMoves([]);
                            }
                        },
                    },
                    {
                        text: 'Yes',
                        onPress: async () => {
                            const moveWithCoral = movesToThisSquare.find(
                                (m) => m.coralPlaced === true,
                            );
                            if (moveWithCoral) {
                                await executeMove({
                                    from: moveWithCoral.from,
                                    to: moveWithCoral.to,
                                    coralPlaced: true,
                                    ...(moveWithCoral.promotion && { promotion: 'q' }),
                                });
                                setVisibleMoves([]);
                                setSelectedSquare(null);
                                setWhaleDestination(null);
                                setWhaleOrientationMoves([]);
                            }
                        },
                    },
                ]);
                return;
            } else if (hasCoralRemoved) {
                showAlert('Hunter Effect', 'Remove coral from this square?', [
                    {
                        text: 'No',
                        onPress: async () => {
                            const moveWithoutCoralRemoval = movesToThisSquare.find(
                                (m) => m.coralRemoved === false,
                            );
                            if (moveWithoutCoralRemoval) {
                                await executeMove({
                                    from: moveWithoutCoralRemoval.from,
                                    to: moveWithoutCoralRemoval.to,
                                    coralRemoved: false,
                                    ...(moveWithoutCoralRemoval.promotion && { promotion: 'q' }),
                                });
                                setVisibleMoves([]);
                                setSelectedSquare(null);
                                setWhaleDestination(null);
                                setWhaleOrientationMoves([]);
                            }
                        },
                    },
                    {
                        text: 'Yes',
                        onPress: async () => {
                            const moveWithCoralRemoval = movesToThisSquare.find(
                                (m) => m.coralRemoved === true,
                            );
                            if (moveWithCoralRemoval) {
                                await executeMove({
                                    from: moveWithCoralRemoval.from,
                                    to: moveWithCoralRemoval.to,
                                    coralRemoved: true,
                                    ...(moveWithCoralRemoval.promotion && { promotion: 'q' }),
                                });
                                setVisibleMoves([]);
                                setSelectedSquare(null);
                                setWhaleDestination(null);
                                setWhaleOrientationMoves([]);
                            }
                        },
                    },
                ]);
                return;
            }
        }

        await executeMove({
            from: move.from,
            to: move.to,
            ...(move.promotion && { promotion: 'q' }),
        });
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
    };

    const handleExportState = async () => {
        // Close menu first and wait for animation to complete
        closeMenu();
        await new Promise((resolve) => setTimeout(resolve, 300));

        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const gameStateData = {
                schemaVersion: GAME_STATE_VERSION,
                exportedAt: new Date().toISOString(),
                state: {
                    fen: coralClash.fen(),
                    board: coralClash.board(),
                    history: coralClash.history(),
                    turn: coralClash.turn(),
                    whalePositions: coralClash.whalePositions(),
                    coral: coralClash.getAllCoral(),
                    coralRemaining: coralClash.getCoralRemainingCounts(),
                    isGameOver: coralClash.isGameOver(),
                    inCheck: coralClash.inCheck(),
                    isCheckmate: coralClash.isCheckmate(),
                    isStalemate: coralClash.isStalemate(),
                    isDraw: coralClash.isDraw(),
                    isCoralVictory: coralClash.isCoralVictory(),
                },
            };

            const jsonString = JSON.stringify(gameStateData, null, 2);
            const filename = `coral-clash-state-${timestamp}.json`;

            // Copy to clipboard (more reliable than Share for large JSON)
            Clipboard.setString(jsonString);
            showAlert(
                'Game State Exported',
                `Copied to clipboard!\n\nFilename: ${filename}\n\nPaste into a text editor to save.`,
            );
        } catch (error) {
            showAlert('Export Failed', error.message);
        }
    };

    const handleFlipBoard = () => {
        closeMenu();
        toggleBoardFlip();
    };

    const translateY = slideAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [400, 0],
    });

    const currentTurn = coralClash.turn();

    // Determine player colors based on userColor (for PvP) or board orientation (for offline)
    // For pass-and-play (userColor = null), colors depend on board flip
    let bottomPlayerColor, topPlayerColor;
    if (userColor) {
        // PvP or computer: user has a fixed color
        bottomPlayerColor = userColor;
        topPlayerColor = userColor === 'w' ? 'b' : 'w';
    } else {
        // Pass-and-play: colors change with board flip
        // When not flipped: White at bottom, Black at top
        // When flipped: Black at bottom, White at top
        if (isBoardFlipped) {
            bottomPlayerColor = 'b';
            topPlayerColor = 'w';
        } else {
            bottomPlayerColor = 'w';
            topPlayerColor = 'b';
        }
    }

    // Determine which player is active based on current turn
    // For online games, use server's turn state (isUserTurn) to avoid sync issues after undo
    let isTopPlayerActive, isBottomPlayerActive;
    if (isOnlineGame && gameData) {
        // Online game: use server state
        // isUserTurn tells us if it's the user's turn (bottom player)
        isBottomPlayerActive = isUserTurn;
        isTopPlayerActive = !isUserTurn;
    } else {
        // Offline/local game: use local engine state
        isTopPlayerActive = currentTurn === topPlayerColor;
        isBottomPlayerActive = currentTurn === bottomPlayerColor;
    }

    // Get player IDs for time tracking
    const getPlayerIdForColor = (color) => {
        if (!gameData) return null;
        if (gameData.whitePlayerId && gameData.blackPlayerId) {
            return color === 'w' ? gameData.whitePlayerId : gameData.blackPlayerId;
        }
        // For computer games or when color assignment isn't in game data
        if (color === 'w') {
            return gameData.creatorId;
        }
        return gameData.opponentId === 'computer' ? 'computer' : gameData.opponentId;
    };

    const topPlayerId = getPlayerIdForColor(topPlayerColor);
    const bottomPlayerId = getPlayerIdForColor(bottomPlayerColor);

    const topPlayerTime =
        localTimeRemaining && topPlayerId ? localTimeRemaining[topPlayerId] : null;
    const bottomPlayerTime =
        localTimeRemaining && bottomPlayerId ? localTimeRemaining[bottomPlayerId] : null;

    return (
        <View style={styles.container}>
            <View style={styles.contentWrapper}>
                {/* Top Player Status Bar */}
                <View style={[styles.topPlayerBar, { width: boardSize }]}>
                    <PlayerStatusBar
                        playerName={topPlayerData.name}
                        avatarKey={topPlayerData.avatarKey}
                        isComputer={topPlayerData.isComputer}
                        isActive={isTopPlayerActive}
                        color={topPlayerColor}
                        coralRemaining={coralClash.getCoralRemaining(topPlayerColor)}
                        coralUnderControl={coralClash.getCoralAreaControl(topPlayerColor)}
                        timeRemaining={topPlayerTime}
                    />
                </View>

                <View style={[styles.spacer, isCompact && styles.spacerCompact]} />

                {/* Game Board */}
                <View style={{ position: 'relative', alignSelf: 'center' }}>
                    <EmptyBoard size={boardSize} boardFlipped={isBoardFlipped} />
                    {/* Transparent overlay to capture clicks on all squares - rendered first so pieces/moves can intercept */}
                    <TouchableOpacity
                        style={{
                            position: 'absolute',
                            width: boardSize,
                            height: boardSize,
                            top: 0,
                            left: 0,
                        }}
                        activeOpacity={1}
                        onPress={(event) => {
                            // Calculate which square was clicked based on coordinates
                            const { locationX, locationY } = event.nativeEvent;
                            const cellSize = boardSize / 8;
                            const col = Math.floor(locationX / cellSize);
                            const row = Math.floor((boardSize - locationY) / cellSize);

                            // Convert to chess notation
                            const file = String.fromCharCode(
                                'a'.charCodeAt(0) + (isBoardFlipped ? 7 - col : col),
                            );
                            const rank = (isBoardFlipped ? 8 - row : row + 1).toString();
                            const square = `${file}${rank}`;

                            handleSelectPiece(square);
                        }}
                    />
                    <Coral
                        coralClash={
                            isViewingHistory && historicalCoralClash
                                ? historicalCoralClash
                                : coralClash
                        }
                        size={boardSize}
                        boardFlipped={isBoardFlipped}
                        userColor={userColor}
                        updateTrigger={updateCounter}
                    />
                    <Pieces
                        board={
                            isViewingHistory && historicalBoard
                                ? historicalBoard
                                : coralClash.board()
                        }
                        onSelectPiece={handleSelectPiece}
                        size={boardSize}
                        userColor={userColor}
                        boardFlipped={isBoardFlipped}
                        isProcessing={isGameActionProcessing}
                    />
                    <Moves
                        visibleMoves={visibleMoves}
                        onSelectMove={handleSelectMove}
                        size={boardSize}
                        isEnemyMoves={isViewingEnemyMoves}
                        boardFlipped={isBoardFlipped}
                        isPlayerTurn={isPlayerTurn}
                        isProcessing={isGameActionProcessing}
                    />
                </View>

                <View style={[styles.spacer, isCompact && styles.spacerCompact]} />

                {/* Bottom Player Status Bar */}
                <View style={[styles.bottomPlayerBar, { width: boardSize }]}>
                    <PlayerStatusBar
                        playerName={bottomPlayerData.name}
                        avatarKey={bottomPlayerData.avatarKey}
                        isComputer={bottomPlayerData.isComputer}
                        isActive={isBottomPlayerActive}
                        color={bottomPlayerColor}
                        coralRemaining={coralClash.getCoralRemaining(bottomPlayerColor)}
                        coralUnderControl={coralClash.getCoralAreaControl(bottomPlayerColor)}
                        timeRemaining={bottomPlayerTime}
                    />
                </View>

                {/* Game Request Banner (Undo/Reset) - Only for PvP games */}
                {renderGameRequestBanner &&
                    renderGameRequestBanner({ coralClash, clearVisibleMoves })}

                {/* Status Banners - Priority: notificationStatus > turnNotification > gameStatus */}
                {notificationStatus ? (
                    /* Notification Status Banner (for undo/reset notifications) - Highest priority */
                    <GameStatusBanner
                        message={notificationStatus.message}
                        type={notificationStatus.type}
                        visible={true}
                        timeout={notificationStatus.timeout}
                        onDismiss={notificationStatus.onDismiss}
                    />
                ) : turnNotification ? (
                    /* Turn Notification Banner - Shows whose turn it is after a move */
                    <GameStatusBanner
                        message={turnNotification.message}
                        type={turnNotification.type}
                        visible={true}
                        timeout={turnNotification.timeout}
                        onDismiss={turnNotification.onDismiss}
                    />
                ) : (
                    /* Game Status Banner - Only shown when no other notifications */
                    <GameStatusBanner
                        message={gameStatus?.message}
                        type={gameStatus?.type}
                        visible={!!gameStatus}
                    />
                )}
            </View>

            {/* Control Bar */}
            {renderControls &&
                renderControls({
                    openMenu,
                    canUndo,
                    handleUndo,
                    clearVisibleMoves,
                    colors,
                    // History navigation
                    canGoBack,
                    canGoForward,
                    handleHistoryBack,
                    handleHistoryForward,
                    isViewingHistory,
                    // Game instance for conditional rendering
                    coralClash,
                    // Game data for server-side status checks
                    gameData,
                })}

            {/* Bottom Drawer Menu */}
            <Modal
                visible={menuVisible}
                transparent
                animationType='fade'
                onRequestClose={closeMenu}
            >
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={closeMenu}>
                    <Animated.View
                        style={[
                            styles.drawerContainer,
                            {
                                backgroundColor: colors.CARD_BACKGROUND,
                                transform: [{ translateY }],
                            },
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.drawerHandle} />

                        <View style={styles.menuItems}>
                            {/* Save Game State - Only show when dev features are enabled */}
                            {DEV_FEATURES_ENABLED && (
                                <TouchableOpacity
                                    style={[
                                        styles.menuItem,
                                        { borderBottomColor: colors.BORDER_COLOR },
                                    ]}
                                    onPress={handleExportState}
                                    activeOpacity={0.7}
                                >
                                    <Icon
                                        name='save'
                                        family='MaterialIcons'
                                        size={28}
                                        color={colors.PRIMARY}
                                    />
                                    <View style={styles.menuItemText}>
                                        <Text
                                            style={[styles.menuItemTitle, { color: colors.TEXT }]}
                                        >
                                            Save Game State
                                        </Text>
                                        <Text
                                            style={[
                                                styles.menuItemSubtitle,
                                                { color: colors.TEXT_SECONDARY },
                                            ]}
                                        >
                                            Export current game position
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            )}

                            {/* Flip Board */}
                            <TouchableOpacity
                                style={[
                                    styles.menuItem,
                                    { borderBottomColor: colors.BORDER_COLOR },
                                ]}
                                onPress={handleFlipBoard}
                                activeOpacity={0.7}
                            >
                                <Icon
                                    name='swap-vert'
                                    family='MaterialIcons'
                                    size={28}
                                    color='#4caf50'
                                />
                                <View style={styles.menuItemText}>
                                    <Text style={[styles.menuItemTitle, { color: colors.TEXT }]}>
                                        Flip Board
                                    </Text>
                                    <Text
                                        style={[
                                            styles.menuItemSubtitle,
                                            { color: colors.TEXT_SECONDARY },
                                        ]}
                                    >
                                        {isBoardFlipped
                                            ? 'Currently showing black on bottom'
                                            : 'Currently showing white on bottom'}
                                    </Text>
                                </View>
                            </TouchableOpacity>

                            {/* Custom menu items from subclasses */}
                            {renderMenuItems &&
                                renderMenuItems({
                                    closeMenu,
                                    coralClash,
                                    colors,
                                    styles,
                                    gameData,
                                })}

                            {/* Resign */}
                            <TouchableOpacity
                                style={[
                                    styles.menuItem,
                                    {
                                        opacity:
                                            coralClash.isGameOver() || isGameActionProcessing
                                                ? 0.5
                                                : 1,
                                    },
                                ]}
                                onPress={handleResign}
                                disabled={coralClash.isGameOver() || isGameActionProcessing}
                                activeOpacity={0.7}
                            >
                                <Icon
                                    name='flag'
                                    family='MaterialIcons'
                                    size={28}
                                    color={
                                        coralClash.isGameOver() || isGameActionProcessing
                                            ? colors.MUTED
                                            : '#d32f2f'
                                    }
                                />
                                <View style={styles.menuItemText}>
                                    <Text
                                        style={[
                                            styles.menuItemTitle,
                                            {
                                                color:
                                                    coralClash.isGameOver() ||
                                                    isGameActionProcessing
                                                        ? colors.MUTED
                                                        : colors.TEXT,
                                            },
                                        ]}
                                    >
                                        {isGameActionProcessing ? 'Resigning...' : 'Resign Game'}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.menuItemSubtitle,
                                            { color: colors.TEXT_SECONDARY },
                                        ]}
                                    >
                                        {isGameActionProcessing
                                            ? 'Please wait...'
                                            : coralClash.isGameOver()
                                              ? 'Game already ended'
                                              : 'Forfeit the current game'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* Cancel Button */}
                        <TouchableOpacity
                            style={[styles.cancelButton, { borderTopColor: colors.BORDER_COLOR }]}
                            onPress={closeMenu}
                            activeOpacity={0.7}
                        >
                            <Text
                                style={[styles.cancelButtonText, { color: colors.TEXT_SECONDARY }]}
                            >
                                Cancel
                            </Text>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
    },
    contentWrapper: {
        width: '100%',
        alignItems: 'center',
        paddingBottom: 100, // Ensure content stays above the absolutely positioned control bar
    },
    topPlayerBar: {
        paddingTop: 8,
        alignSelf: 'center',
    },
    bottomPlayerBar: {
        alignSelf: 'center',
    },
    spacer: {
        height: 12,
    },
    spacerCompact: {
        height: 6,
    },
    // eslint-disable-next-line react-native/no-unused-styles -- Used by child components
    controlBar: {
        position: 'absolute',
        marginBottom: 20,
        bottom: 100,
        left: 0,
        right: 0,
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: 'transparent',
    },
    // eslint-disable-next-line react-native/no-unused-styles -- Used by child components
    controlButton: {
        padding: 12,
        backgroundColor: 'transparent',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    drawerContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    drawerHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#CCCCCC',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    menuItems: {
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    menuItemText: {
        flex: 1,
        marginLeft: 16,
    },
    menuItemTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    menuItemSubtitle: {
        fontSize: 14,
    },
    cancelButton: {
        paddingVertical: 16,
        alignItems: 'center',
        borderTopWidth: 1,
        marginTop: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default BaseCoralClashBoard;
export { styles as baseStyles };
