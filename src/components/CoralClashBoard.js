import { useState, useEffect } from 'react';
import {
    useWindowDimensions,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Share,
    Alert,
} from 'react-native';
import { Icon } from 'galio-framework';
import useCoralClash from '../hooks/useCoralClash';
import { WHALE } from '../hooks/coralClash';
import { applyFixture } from '../hooks/__fixtures__/fixtureLoader';
import EmptyBoard from './EmptyBoard';
import Moves from './Moves';
import Pieces from './Pieces';
import Coral from './Coral';

// Game state schema version for fixtures
const GAME_STATE_VERSION = '1.2.0';

const CoralClash = ({ fixture }) => {
    const { width } = useWindowDimensions();
    const coralClash = useCoralClash();
    const [visibleMoves, setVisibleMoves] = useState([]);
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [whaleDestination, setWhaleDestination] = useState(null);
    const [whaleOrientationMoves, setWhaleOrientationMoves] = useState([]);
    const [isViewingEnemyMoves, setIsViewingEnemyMoves] = useState(false);
    const [fixtureLoaded, setFixtureLoaded] = useState(false);
    const [, forceUpdate] = useState(0);
    const boardSize = Math.min(width, 400);

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
        coralClash.reset();
        setVisibleMoves([]);
        setSelectedSquare(null);
        setWhaleDestination(null);
        setWhaleOrientationMoves([]);
        setIsViewingEnemyMoves(false);
    };

    const handleExportState = async () => {
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

    return (
        <View style={{ alignItems: 'center', flex: 1, width: '100%' }}>
            {/* Control Bar */}
            <View style={styles.controlBar}>
                {/* Reset Button - Left */}
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={handleReset}
                    activeOpacity={0.7}
                >
                    <Icon
                        name='refresh'
                        family='MaterialIcons'
                        size={45}
                        color='#ffffff'
                        style={styles.controlIcon}
                    />
                </TouchableOpacity>

                {/* Export Button - Center (Dev Only) */}
                {process.env.EXPO_PUBLIC_ENABLE_DEV_FEATURES === 'true' && (
                    <TouchableOpacity
                        style={styles.controlButton}
                        onPress={handleExportState}
                        activeOpacity={0.7}
                    >
                        <Icon
                            name='ios-share'
                            family='Ionicons'
                            size={45}
                            color='#ffffff'
                            style={styles.controlIcon}
                        />
                    </TouchableOpacity>
                )}

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
                        size={45}
                        color={canUndo ? '#ffffff' : '#666666'}
                        style={styles.controlIcon}
                    />
                </TouchableOpacity>

                {/* Resign Button - Right */}
                <TouchableOpacity
                    style={styles.controlButton}
                    onPress={handleResign}
                    disabled={coralClash.isGameOver()}
                    activeOpacity={0.7}
                >
                    <Icon
                        name='flag'
                        family='MaterialIcons'
                        size={45}
                        color={coralClash.isGameOver() ? '#666666' : '#ffffff'}
                        style={styles.controlIcon}
                    />
                </TouchableOpacity>
            </View>

            <View style={{ position: 'relative' }}>
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
            {gameStatus && (
                <View style={[styles.statusBanner, { backgroundColor: gameStatus.color }]}>
                    <Text style={styles.statusText}>{gameStatus.message}</Text>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    controlBar: {
        width: '100%',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 5,
        marginBottom: 5,
    },
    controlButton: {
        backgroundColor: 'transparent',
    },
    controlIcon: {
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 3,
    },
    statusBanner: {
        marginTop: 20,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    statusText: {
        color: '#ffffff',
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default CoralClash;
