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

// Game state schema version for fixtures
const GAME_STATE_VERSION = '1.1.0';

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

        const coralWinner = coralClash.isCoralVictory();
        if (coralWinner) {
            const winner = coralWinner === 'w' ? 'White' : 'Black';
            return { message: `${winner} wins by Coral Victory! 🪸`, color: '#1976d2' };
        }

        // Check if coral scoring was triggered but ended in a tie
        // This happens when a crab/octopus reaches the back row but coral control is equal
        if (coralClash.isGameOver() && coralWinner === null) {
            // Check if it was triggered by coral scoring (not stalemate or draw)
            if (!coralClash.isStalemate() && !coralClash.isDraw()) {
                return { message: 'Game Over - Tie! No coral advantage! 🤝🪸', color: '#757575' };
            }
        }

        if (coralClash.isStalemate()) {
            return { message: 'Stalemate - Draw! 🤝', color: '#757575' };
        }

        if (coralClash.isDraw()) {
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
                // Execute whale move with whaleSecondSquare to disambiguate orientation
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
            } else {
                return;
            }
        }

        // Only execute moves for non-whale pieces
        // Whale moves should have returned by now
        if (piece && piece.type === WHALE) {
            return;
        }

        // Execute the move (non-whale pieces only)
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
                {__DEV__ && (
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

                {/* Undo Button - Right */}
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
            </View>

            <View style={{ position: 'relative' }}>
                <EmptyBoard size={boardSize} />
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
