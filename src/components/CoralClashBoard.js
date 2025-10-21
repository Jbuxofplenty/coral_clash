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
} from 'react-native';
import { Icon } from 'galio-framework';
import useCoralClash from '../hooks/useCoralClash';
import { WHALE, applyFixture } from '../../shared';
import EmptyBoard from './EmptyBoard';
import Moves from './Moves';
import Pieces from './Pieces';
import Coral from './Coral';
import PlayerStatusBar from './PlayerStatusBar';
import { useTheme } from '../contexts/ThemeContext';
import { useGamePreferences } from '../contexts/GamePreferencesContext';
import { useAuth } from '../contexts/AuthContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Game state schema version for fixtures
const GAME_STATE_VERSION = '1.2.0';

const CoralClash = ({ fixture }) => {
    const { width } = useWindowDimensions();
    const { colors, isDarkMode } = useTheme();
    const { isBoardFlipped, toggleBoardFlip } = useGamePreferences();
    const { user } = useAuth();
    const coralClash = useCoralClash();
    const [visibleMoves, setVisibleMoves] = useState([]);
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [whaleDestination, setWhaleDestination] = useState(null);
    const [whaleOrientationMoves, setWhaleOrientationMoves] = useState([]);
    const [isViewingEnemyMoves, setIsViewingEnemyMoves] = useState(false);
    const [fixtureLoaded, setFixtureLoaded] = useState(false);
    const [, forceUpdate] = useState(0);
    const [menuVisible, setMenuVisible] = useState(false);
    const [slideAnim] = useState(new Animated.Value(0));
    const boardSize = Math.min(width, 400);

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

    // Load fixture if provided
    useEffect(() => {
        if (fixture && !fixtureLoaded) {
            try {
                applyFixture(coralClash, fixture);
                setFixtureLoaded(true);
                console.log('Fixture loaded successfully');
            } catch (error) {
                console.error('Failed to load fixture:', error);
                Alert.alert('Error', 'Failed to load game state');
            }
        }
    }, [fixture, fixtureLoaded]);

    // Handle random black moves - runs after render, not during
    useEffect(() => {
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
    }, [coralClash.history().length, fixture, fixtureLoaded]);

    // Clear selection state when board is flipped
    useEffect(() => {
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
        setIsViewingEnemyMoves(false);
    }, [isBoardFlipped]);

    // Get game status message
    const getGameStatus = () => {
        if (coralClash.isCheckmate()) {
            const winner = coralClash.turn() === 'w' ? 'Black' : 'White';
            return { message: `Checkmate! ${winner} wins! 🏆`, color: '#d32f2f' };
        }

        const resigned = coralClash.isResigned();
        if (resigned) {
            const winner = resigned === 'w' ? 'Black' : 'White';
            return { message: `${winner} wins by resignation! 🏳️`, color: '#d32f2f' };
        }

        const coralWinner = coralClash.isCoralVictory();
        if (coralWinner) {
            const winner = coralWinner === 'w' ? 'White' : 'Black';
            const whiteScore = coralClash.getCoralAreaControl('w');
            const blackScore = coralClash.getCoralAreaControl('b');
            return {
                message: `${winner} wins by Coral Victory! 🪸\n${whiteScore} White - ${blackScore} Black`,
                color: '#1976d2',
            };
        }

        if (coralClash.isStalemate()) {
            return { message: 'Stalemate - Draw! 🤝', color: '#757575' };
        }

        if (coralClash.isDraw()) {
            // Check if this is specifically a coral tie
            // Coral tie happens when coral scoring triggered but control is equal
            const coralScoringTriggered =
                coralClash.getCoralRemaining('w') === 0 ||
                coralClash.getCoralRemaining('b') === 0 ||
                coralClash.isGameOver();

            if (coralScoringTriggered && coralWinner === null && coralClash.isGameOver()) {
                const score = coralClash.getCoralAreaControl('w');
                return {
                    message: `Draw - Coral Tie! 🤝🪸\n${score} - ${score}`,
                    color: '#757575',
                };
            }

            return { message: 'Draw! 🤝', color: '#757575' };
        }

        if (coralClash.inCheck()) {
            const player = coralClash.turn() === 'w' ? 'White' : 'Black';
            return { message: `${player} is in Check! ⚠️`, color: '#f57c00' };
        }

        return null;
    };

    const gameStatus = getGameStatus();

    const handleUndo = () => {
        // Undo computer's move (black)
        coralClash.undo();
        // Undo user's move (white)
        coralClash.undo();
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
        setIsViewingEnemyMoves(false);
    };

    // Can only undo if at least 2 moves have been made (user + computer)
    const canUndo = coralClash.history().length >= 2;

    const handleResign = () => {
        closeMenu();
        // Confirm resignation
        Alert.alert('Resign Game', 'Are you sure you want to resign? You will lose the game.', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Resign',
                style: 'destructive',
                onPress: () => {
                    // Current player resigns
                    coralClash.resign(coralClash.turn());
                    // Clear selection state
                    setVisibleMoves([]);
                    setSelectedSquare(null);
                    setWhaleDestination(null);
                    setWhaleOrientationMoves([]);
                    setIsViewingEnemyMoves(false);
                },
            },
        ]);
    };

    const handleSelectPiece = (square) => {
        // Don't allow piece selection if game is over
        if (coralClash.isGameOver()) {
            return;
        }

        const piece = coralClash.get(square);
        const currentTurn = coralClash.turn();

        // Check if this is an enemy piece
        const isEnemyPiece = piece && piece.color !== currentTurn;

        // Check if this is a whale
        if (piece && piece.type === WHALE) {
            // Whale selected - get ALL moves for this whale's color
            const whaleColor = piece.color;
            const allMoves = coralClash.moves({ verbose: true, color: whaleColor });

            // Filter to only THIS whale's moves
            const whaleMoves = allMoves.filter((m) => m.piece === WHALE);

            const allDestinations = new Set();
            whaleMoves.forEach((move) => {
                allDestinations.add(move.to);
            });

            // Create a simple move list with just destinations (we'll filter later)
            const destinationMoves = Array.from(allDestinations).map((dest) => {
                return whaleMoves.find((m) => m.to === dest);
            });

            setVisibleMoves(destinationMoves);
            setSelectedSquare(isEnemyPiece ? null : square);
            setWhaleDestination(null);
            setWhaleOrientationMoves([]);
            setIsViewingEnemyMoves(isEnemyPiece);
        } else if (piece) {
            // Regular piece - get moves for this piece's color
            const moves = coralClash.moves({ square: square, verbose: true, color: piece.color });
            setVisibleMoves(moves);
            setSelectedSquare(isEnemyPiece ? null : square);
            setWhaleDestination(null);
            setWhaleOrientationMoves([]);
            setIsViewingEnemyMoves(isEnemyPiece);
        } else {
            // No piece on this square
            setVisibleMoves([]);
            setSelectedSquare(null);
            setWhaleDestination(null);
            setWhaleOrientationMoves([]);
            setIsViewingEnemyMoves(false);
        }
    };

    const handleSelectMove = (move) => {
        // Don't allow moves if game is over
        if (coralClash.isGameOver()) {
            return;
        }

        // Don't allow executing enemy moves - only show them
        if (isViewingEnemyMoves) {
            return;
        }

        const piece = coralClash.get(selectedSquare || move.from);

        // Check if this is a whale move and we haven't selected the first square yet
        if (piece && piece.type === WHALE && !whaleDestination) {
            // First click - user selected where one whale half should go
            // Get ALL verbose moves (whale moves come from both squares)
            const allMoves = coralClash.moves({ verbose: true });

            // Find WHALE moves that go to the clicked destination from THIS whale (not opponent)
            const whaleColor = piece.color.toLowerCase();
            const movesToThisSquare = allMoves.filter(
                (m) =>
                    m.to === move.to && m.piece === WHALE && m.color.toLowerCase() === whaleColor,
            );

            if (movesToThisSquare.length > 0) {
                // Group moves by whaleSecondSquare - each unique second square is a different orientation
                const orientationMap = new Map();

                movesToThisSquare.forEach((m) => {
                    // Use whaleSecondSquare as the key - different second squares = different orientations
                    if (m.whaleSecondSquare && !orientationMap.has(m.whaleSecondSquare)) {
                        orientationMap.set(m.whaleSecondSquare, m);
                    }
                });

                // If only one orientation, execute immediately
                if (orientationMap.size === 1) {
                    const onlyMove = Array.from(orientationMap.values())[0];
                    coralClash.move({ from: onlyMove.from, to: onlyMove.to });
                    setSelectedSquare(null);
                    setVisibleMoves([]);
                    setWhaleDestination(null);
                    setWhaleOrientationMoves([]);
                    return;
                }

                // Multiple orientations - show them to the user
                // Show where the whale's second square will be for each orientation
                setWhaleDestination(move.to);
                setWhaleOrientationMoves(movesToThisSquare);

                // Create "moves" for each unique orientation to render
                const orientationMoves = Array.from(orientationMap.values()).map((m) => {
                    return {
                        ...m,
                        to: m.whaleSecondSquare, // Show where the other half will be
                        isOrientationOption: true,
                    };
                });

                // Also add the selected destination square to keep it highlighted
                const destinationSquareMove = {
                    ...movesToThisSquare[0],
                    to: move.to,
                    isDestinationMarker: true,
                };

                setVisibleMoves([destinationSquareMove, ...orientationMoves]);
                return;
            } else {
                // No moves found to this square - shouldn't happen
                console.error('No whale moves found to square:', move.to);
                return;
            }
        } else if (whaleDestination) {
            // Second click - user selected which orientation by clicking the second square position
            // Find the move where destination matches and whaleSecondSquare matches what they clicked
            const selectedMove = whaleOrientationMoves.find((m) => {
                return m.to === whaleDestination && m.whaleSecondSquare === move.to;
            });

            if (selectedMove) {
                // Check if whale has coral removal options
                const allOrientationMoves = whaleOrientationMoves.filter(
                    (m) =>
                        m.to === selectedMove.to &&
                        m.whaleSecondSquare === selectedMove.whaleSecondSquare,
                );

                if (allOrientationMoves.length > 1) {
                    // Has coral removal options - show dialog
                    const coralOptions = allOrientationMoves.map((m) => ({
                        move: m,
                        squares: m.coralRemovedSquares || [],
                    }));

                    // Build alert options based on available coral removal variants
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
                            onPress: () => {
                                coralClash.move({
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

                    Alert.alert(
                        'Hunter Effect (Whale)',
                        'Choose coral removal option:',
                        alertButtons,
                    );
                    return;
                } else {
                    // No coral options, execute move directly
                    coralClash.move({
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

        // Only execute moves for non-whale pieces
        // Whale moves should have returned by now
        if (piece && piece.type === WHALE) {
            return;
        }

        // Check if there are coral action options for this move
        const allMoves = coralClash.moves({ verbose: true });
        const movesToThisSquare = allMoves.filter((m) => m.from === move.from && m.to === move.to);

        // Check if there are multiple variants (with/without coral actions)
        if (movesToThisSquare.length > 1) {
            // There are coral action options - prompt the user
            const hasCoralPlaced = movesToThisSquare.some((m) => m.coralPlaced === true);
            const hasCoralRemoved = movesToThisSquare.some((m) => m.coralRemoved === true);

            if (hasCoralPlaced) {
                // Gatherer can place coral
                Alert.alert('Gatherer Effect', 'Place coral on this square?', [
                    {
                        text: 'No',
                        onPress: () => {
                            const moveWithoutCoral = movesToThisSquare.find(
                                (m) => m.coralPlaced === false,
                            );
                            if (moveWithoutCoral) {
                                coralClash.move({
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
                        onPress: () => {
                            const moveWithCoral = movesToThisSquare.find(
                                (m) => m.coralPlaced === true,
                            );
                            if (moveWithCoral) {
                                coralClash.move({
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
                // Hunter can remove coral
                Alert.alert('Hunter Effect', 'Remove coral from this square?', [
                    {
                        text: 'No',
                        onPress: () => {
                            const moveWithoutCoralRemoval = movesToThisSquare.find(
                                (m) => m.coralRemoved === false,
                            );
                            if (moveWithoutCoralRemoval) {
                                coralClash.move({
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
                        onPress: () => {
                            const moveWithCoralRemoval = movesToThisSquare.find(
                                (m) => m.coralRemoved === true,
                            );
                            if (moveWithCoralRemoval) {
                                coralClash.move({
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

        // Execute the move (non-whale pieces only, no coral actions)
        // Only pass the fields that move() expects: from, to, promotion
        coralClash.move({
            from: move.from,
            to: move.to,
            ...(move.promotion && { promotion: 'q' }),
        });
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
    };

    const handleReset = () => {
        closeMenu();
        Alert.alert('Reset Game', 'Are you sure you want to start a new game?', [
            {
                text: 'Cancel',
                style: 'cancel',
            },
            {
                text: 'Reset',
                style: 'destructive',
                onPress: () => {
                    coralClash.reset();
                    setVisibleMoves([]);
                    setSelectedSquare(null);
                    setWhaleDestination(null);
                    setWhaleOrientationMoves([]);
                    setIsViewingEnemyMoves(false);
                },
            },
        ]);
    };

    const handleExportState = async () => {
        closeMenu();
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const gameState = {
                schemaVersion: GAME_STATE_VERSION,
                exportedAt: new Date().toISOString(),
                state: {
                    fen: coralClash.fen(),
                    board: coralClash.board(),
                    history: coralClash.history(),
                    turn: coralClash.turn(),
                    whalePositions: coralClash.whalePositions(), // v1.1.0: preserve whale orientation
                    coral: coralClash.getAllCoral(), // v1.2.0: coral placements
                    coralRemaining: coralClash.getCoralRemainingCounts(), // v1.2.0: coral counts
                    isGameOver: coralClash.isGameOver(),
                    inCheck: coralClash.inCheck(),
                    isCheckmate: coralClash.isCheckmate(),
                    isStalemate: coralClash.isStalemate(),
                    isDraw: coralClash.isDraw(),
                    isCoralVictory: coralClash.isCoralVictory(),
                },
            };

            const jsonString = JSON.stringify(gameState, null, 2);

            await Share.share({
                message: jsonString,
                title: `coral-clash-state-${timestamp}.json`,
            });
        } catch (error) {
            Alert.alert('Export Failed', error.message);
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

    // Determine which player is on top/bottom based on board flip
    const topPlayer = isBoardFlipped
        ? { name: user?.displayName || 'Player', avatarKey: user?.avatarKey, isComputer: false }
        : { name: 'Computer', isComputer: true };

    const bottomPlayer = isBoardFlipped
        ? { name: 'Computer', isComputer: true }
        : { name: user?.displayName || 'Player', avatarKey: user?.avatarKey, isComputer: false };

    // Determine which player's turn it is
    const currentTurn = coralClash.turn();
    const isTopPlayerActive = isBoardFlipped ? currentTurn === 'w' : currentTurn === 'b';
    const isBottomPlayerActive = isBoardFlipped ? currentTurn === 'b' : currentTurn === 'w';

    return (
        <View style={styles.container}>
            {/* Content Area */}
            <View style={{ width: '100%', alignItems: 'center' }}>
                {/* Top Player Status Bar */}
                <View style={[styles.topPlayerBar, { width: boardSize }]}>
                    <PlayerStatusBar
                        playerName={topPlayer.name}
                        avatarKey={topPlayer.avatarKey}
                        isComputer={topPlayer.isComputer}
                        isActive={isTopPlayerActive}
                    />
                </View>

                {/* Spacer */}
                <View style={styles.spacer} />

                {/* Game Board */}
                <View style={{ position: 'relative', alignSelf: 'center' }}>
                    <EmptyBoard size={boardSize} />
                    <Coral coralClash={coralClash} size={boardSize} />
                    <Pieces
                        board={coralClash.board()}
                        onSelectPiece={handleSelectPiece}
                        size={boardSize}
                    />
                    <Moves
                        visibleMoves={visibleMoves}
                        onSelectMove={handleSelectMove}
                        size={boardSize}
                        showOrientations={whaleDestination !== null}
                        selectedDestination={whaleDestination}
                        isEnemyMoves={isViewingEnemyMoves}
                    />
                </View>

                {/* Game Status Banner */}
                {gameStatus && (
                    <View style={[styles.statusBanner, { backgroundColor: gameStatus.color }]}>
                        <Text style={styles.statusText}>{gameStatus.message}</Text>
                    </View>
                )}

                {/* Spacer */}
                <View style={styles.spacer} />

                {/* Bottom Player Status Bar */}
                <View style={[styles.bottomPlayerBar, { width: boardSize }]}>
                    <PlayerStatusBar
                        playerName={bottomPlayer.name}
                        avatarKey={bottomPlayer.avatarKey}
                        isComputer={bottomPlayer.isComputer}
                        isActive={isBottomPlayerActive}
                    />
                </View>
            </View>

            {/* Control Bar at Bottom - Always Visible */}
            <View style={styles.controlBar}>
                {/* Menu Button */}
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={openMenu}
                    activeOpacity={0.7}
                >
                    <Icon name='menu' family='MaterialIcons' size={44} color={colors.WHITE} />
                </TouchableOpacity>

                {/* Undo Button */}
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={handleUndo}
                    disabled={!canUndo}
                    activeOpacity={0.7}
                >
                    <Icon
                        name='undo'
                        family='MaterialIcons'
                        size={44}
                        color={canUndo ? colors.WHITE : colors.MUTED}
                    />
                </TouchableOpacity>
            </View>

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
                        {/* Drawer Handle */}
                        <View style={styles.drawerHandle} />

                        {/* Menu Items */}
                        <View style={styles.menuItems}>
                            {/* Save Game State */}
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
                                    <Text style={[styles.menuItemTitle, { color: colors.TEXT }]}>
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

                            {/* Reset Game */}
                            <TouchableOpacity
                                style={[
                                    styles.menuItem,
                                    { borderBottomColor: colors.BORDER_COLOR },
                                ]}
                                onPress={handleReset}
                                activeOpacity={0.7}
                            >
                                <Icon
                                    name='refresh'
                                    family='MaterialIcons'
                                    size={28}
                                    color='#f57c00'
                                />
                                <View style={styles.menuItemText}>
                                    <Text style={[styles.menuItemTitle, { color: colors.TEXT }]}>
                                        Reset Game
                                    </Text>
                                    <Text
                                        style={[
                                            styles.menuItemSubtitle,
                                            { color: colors.TEXT_SECONDARY },
                                        ]}
                                    >
                                        Start a new game from the beginning
                                    </Text>
                                </View>
                            </TouchableOpacity>

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
    statusBanner: {
        marginTop: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
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

export default CoralClash;
