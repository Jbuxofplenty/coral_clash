import { useState, useEffect } from 'react';
import {
    useWindowDimensions,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Share,
    Alert,
    Modal,
    Animated,
    Dimensions,
    Platform,
} from 'react-native';
import { Icon } from 'galio-framework';
import { useCoralClash } from '../hooks';
import { WHALE, applyFixture, restoreGameFromSnapshot, CoralClash } from '../../shared';
import EmptyBoard from './EmptyBoard';
import Moves from './Moves';
import Pieces from './Pieces';
import Coral from './Coral';
import PlayerStatusBar from './PlayerStatusBar';
import GameStatusBanner from './GameStatusBanner';
import LoadingScreen from './LoadingScreen';
import { useTheme, useGamePreferences, useAuth, useAlert } from '../contexts';
import { useGameActions } from '../hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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
 * - opponentType: 'computer' or undefined for PvP
 * - topPlayerData: { name, avatarKey, isComputer }
 * - bottomPlayerData: { name, avatarKey, isComputer }
 * - renderControls: Function to render control buttons
 * - renderMenuItems: Function to render menu drawer items
 * - onMoveComplete: Callback after a move is successfully made
 * - enableUndo: Boolean indicating if undo feature is enabled
 * - onUndo: Callback for undo action
 * - userColor: Color the current user is playing as ('w' or 'b', null for spectator/offline)
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
    userColor = null,
    effectiveBoardFlip = null,
}) => {
    const { width } = useWindowDimensions();
    const { colors } = useTheme();
    const { isBoardFlipped: contextBoardFlipped, toggleBoardFlip } = useGamePreferences();
    const { user } = useAuth();
    const { showAlert } = useAlert();

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
        isLoading: gameActionsLoading,
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
    const boardSize = Math.min(width, 400);

    // Safety check - show loading if coralClash is not initialized
    if (!coralClash) {
        return <LoadingScreen iconName='gamepad' message='Loading game...' />;
    }

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
        if (gameState && !gameStateLoaded && !fixture) {
            try {
                restoreGameFromSnapshot(coralClash, gameState);
                setGameStateLoaded(true);
                forceUpdate((n) => n + 1);
            } catch (error) {
                console.error(`Failed to load game state on ${Platform.OS}:`, error);
                showAlert('Error', 'Failed to load game state');
            }
        }
    }, [gameState, gameStateLoaded, fixture, coralClash, width]);

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
    }, [fixture, fixtureLoaded, coralClash]);

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
    }, [coralClash.history().length, fixture, fixtureLoaded, gameId, opponentType, coralClash]);

    // Clear selection state when board is flipped
    useEffect(() => {
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
        setIsViewingEnemyMoves(false);
    }, [isBoardFlipped]);

    // Update historical board state when historyIndex changes
    useEffect(() => {
        if (historyIndex === null) {
            setHistoricalBoard(null);
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

            // Store the board state
            setHistoricalBoard(tempGame.board());
        } catch (error) {
            console.error('Error creating historical board state:', error);
            setHistoryIndex(null);
            setHistoricalBoard(null);
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
            return { message: 'Stalemate - Draw! 🤝', type: 'draw' };
        }

        if (coralClash.isDraw()) {
            // Check if this is specifically a coral tie
            const coralScoringTriggered =
                coralClash.getCoralRemaining('w') === 0 ||
                coralClash.getCoralRemaining('b') === 0 ||
                coralClash.isGameOver();

            if (coralScoringTriggered && coralWinner === null && coralClash.isGameOver()) {
                const score = coralClash.getCoralAreaControl('w');
                return {
                    message: `Draw - Coral Tie! 🤝🪸\n${score} - ${score}`,
                    type: 'draw',
                };
            }

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
    const isGameOver = coralClash.isGameOver();
    const canUndo = enableUndo && historyLength >= 2 && !isGameOver;

    // Calculate if it's the player's turn (stable calculation, not inline in JSX)
    const isPlayerTurn = userColor ? coralClash.turn() === userColor : true;

    const handleUndo = () => {
        if (onUndo) {
            onUndo(coralClash);
            // Exit history view when undo is performed
            setHistoryIndex(null);
            // Force re-render to show updated board after undo
            forceUpdate((n) => n + 1);
        }
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
        setIsViewingEnemyMoves(false);
    };

    const handleResign = () => {
        closeMenu();
        showAlert('Resign Game', 'Are you sure you want to resign? You will lose the game.', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Resign',
                style: 'destructive',
                onPress: async () => {
                    // Use the resign method from useGameActions hook
                    const success = await resignAPI();
                    if (success) {
                        setVisibleMoves([]);
                        setSelectedSquare(null);
                        setWhaleDestination(null);
                        setWhaleOrientationMoves([]);
                        setIsViewingEnemyMoves(false);
                    }
                },
            },
        ]);
    };

    // Execute a move - for online games, use backend-first; for offline, apply locally
    const executeMove = async (moveParams) => {
        if (gameId) {
            // Online game: backend-first approach (handled by useGameActions)
            // The Firestore listener will update the UI automatically
            const result = await makeMoveAPI(moveParams);
            if (result) {
                // Exit history view when a move is made
                setHistoryIndex(null);
                // Call the onMoveComplete callback if provided
                if (onMoveComplete) {
                    await onMoveComplete(result, moveParams);
                }
            }
            return result;
        } else {
            // Offline game: apply locally
            const moveResult = coralClash.move(moveParams);
            if (moveResult) {
                // Exit history view when a move is made
                setHistoryIndex(null);
                // Force re-render to update UI (e.g., enable undo button)
                forceUpdate((n) => n + 1);
            }
            return moveResult;
        }
    };

    // executeResign function removed - now using resignAPI from useGameActions hook

    const handleSelectPiece = (square) => {
        // Disable interaction when viewing history or game is over
        if (coralClash.isGameOver() || isViewingHistory) {
            return;
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
        if (coralClash.isGameOver()) {
            return;
        }

        if (isViewingEnemyMoves) {
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
                            label = "Don't remove coral";
                        } else if (option.squares.length === 1) {
                            label = `Remove coral from ${option.squares[0]}`;
                        } else {
                            label = `Remove coral from both (${option.squares.join(', ')})`;
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
                    );
                    return;
                } else {
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
        closeMenu();
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

            await Share.share({
                message: jsonString,
                title: `coral-clash-state-${timestamp}.json`,
            });
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
    // Bottom player (user) gets userColor, top player (opponent) gets opposite
    const bottomPlayerColor = userColor || 'w'; // Default to white for offline games
    const topPlayerColor = bottomPlayerColor === 'w' ? 'b' : 'w';

    // Determine which player is active based on current turn
    const isTopPlayerActive = currentTurn === topPlayerColor;
    const isBottomPlayerActive = currentTurn === bottomPlayerColor;

    return (
        <View style={styles.container}>
            <View style={{ width: '100%', alignItems: 'center' }}>
                {/* Top Player Status Bar */}
                <View style={[styles.topPlayerBar, { width: boardSize }]}>
                    <PlayerStatusBar
                        playerName={topPlayerData.name}
                        avatarKey={topPlayerData.avatarKey}
                        isComputer={topPlayerData.isComputer}
                        isActive={isTopPlayerActive}
                        color={topPlayerColor}
                        coralRemaining={coralClash.getCoralRemaining(topPlayerColor)}
                    />
                </View>

                <View style={styles.spacer} />

                {/* Game Board */}
                <View style={{ position: 'relative', alignSelf: 'center' }}>
                    <EmptyBoard size={boardSize} boardFlipped={isBoardFlipped} />
                    <Coral
                        coralClash={coralClash}
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
                    />
                    <Moves
                        visibleMoves={visibleMoves}
                        onSelectMove={handleSelectMove}
                        size={boardSize}
                        isEnemyMoves={isViewingEnemyMoves}
                        boardFlipped={isBoardFlipped}
                        isPlayerTurn={isPlayerTurn}
                    />
                </View>

                <View style={styles.spacer} />

                {/* Bottom Player Status Bar */}
                <View style={[styles.bottomPlayerBar, { width: boardSize }]}>
                    <PlayerStatusBar
                        playerName={bottomPlayerData.name}
                        avatarKey={bottomPlayerData.avatarKey}
                        isComputer={bottomPlayerData.isComputer}
                        isActive={isBottomPlayerActive}
                        color={bottomPlayerColor}
                        coralRemaining={coralClash.getCoralRemaining(bottomPlayerColor)}
                    />
                </View>

                {/* Game Request Banner (Undo/Reset) - Only for PvP games */}
                {renderGameRequestBanner && renderGameRequestBanner({ coralClash })}

                {/* Game Status Banner */}
                <GameStatusBanner
                    message={gameStatus?.message}
                    type={gameStatus?.type}
                    visible={!!gameStatus}
                />
            </View>

            {/* Control Bar */}
            {renderControls &&
                renderControls({
                    openMenu,
                    canUndo,
                    handleUndo,
                    colors,
                    // History navigation
                    canGoBack,
                    canGoForward,
                    handleHistoryBack,
                    handleHistoryForward,
                    isViewingHistory,
                    // Game instance for conditional rendering
                    coralClash,
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
                                })}

                            {/* Resign */}
                            <TouchableOpacity
                                style={[
                                    styles.menuItem,
                                    { opacity: coralClash.isGameOver() ? 0.5 : 1 },
                                ]}
                                onPress={handleResign}
                                disabled={coralClash.isGameOver()}
                                activeOpacity={0.7}
                            >
                                <Icon
                                    name='flag'
                                    family='MaterialIcons'
                                    size={28}
                                    color={coralClash.isGameOver() ? colors.MUTED : '#d32f2f'}
                                />
                                <View style={styles.menuItemText}>
                                    <Text
                                        style={[
                                            styles.menuItemTitle,
                                            {
                                                color: coralClash.isGameOver()
                                                    ? colors.MUTED
                                                    : colors.TEXT,
                                            },
                                        ]}
                                    >
                                        Resign Game
                                    </Text>
                                    <Text
                                        style={[
                                            styles.menuItemSubtitle,
                                            { color: colors.TEXT_SECONDARY },
                                        ]}
                                    >
                                        {coralClash.isGameOver()
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
    controlBar: {
        position: 'absolute',
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
