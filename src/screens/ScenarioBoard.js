import { LinearGradient } from 'expo-linear-gradient';
import { Icon as GalioIcon } from 'galio-framework';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { applyFixture } from '../../shared';
import { Icon } from '../components';
import Coral from '../components/Coral';
import EmptyBoard from '../components/EmptyBoard';
import Moves from '../components/Moves';
import Pieces from '../components/Pieces';
import { useTheme } from '../contexts';
import { useCoralClash } from '../hooks';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function ScenarioBoard({ route, navigation }) {
    const { scenario } = route.params;
    const { colors } = useTheme();
    const { width } = useWindowDimensions();
    const coralClash = useCoralClash();
    const [updateCounter, setUpdateCounter] = useState(0);
    const [showingMoves, setShowingMoves] = useState(false);
    const [visibleMoves, setVisibleMoves] = useState([]);
    const [selectedSquare, setSelectedSquare] = useState(null);
    const [selectedPieceColor, setSelectedPieceColor] = useState(null);
    const [isAutoPlaying, setIsAutoPlaying] = useState(false);
    const [autoPlayEnabled, setAutoPlayEnabled] = useState(true);
    const [autoPlayPathMoves, setAutoPlayPathMoves] = useState([]);

    // Calculate board size
    const boardSize = Math.min(width * 0.95, SCREEN_HEIGHT * 0.5);

    // Load initial fixture
    useEffect(() => {
        if (scenario && scenario.fixture) {
            try {
                // Skip validation for tutorial scenarios - they may have simplified board states
                applyFixture(coralClash, scenario.fixture, { skipValidation: true });
                setUpdateCounter((prev) => prev + 1);
            } catch (error) {
                console.error('Error loading scenario fixture:', error);
            }
        }
    }, [coralClash, scenario]);

    // Clear selection when auto-play starts
    useEffect(() => {
        if (isAutoPlaying) {
            setSelectedSquare(null);
            setVisibleMoves([]);
            setShowingMoves(false);
            setSelectedPieceColor(null);
        }
    }, [isAutoPlaying]);

    // Auto-play sequence effect
    useEffect(() => {
        if (!scenario?.autoPlaySequence || !autoPlayEnabled) {
            return;
        }

        let timeoutIds = [];
        let isActive = true;

        const playSequence = async () => {
            if (!isActive) return;

            // Clear any manual selections and path highlighting before resetting
            setSelectedSquare(null);
            setVisibleMoves([]);
            setShowingMoves(false);
            setSelectedPieceColor(null);
            setAutoPlayPathMoves([]);

            // Reset to initial state at the start of each sequence
            try {
                applyFixture(coralClash, scenario.fixture, { skipValidation: true });
                setUpdateCounter((prev) => prev + 1);
            } catch (error) {
                console.error('Error resetting scenario at start:', error);
                return;
            }

            setIsAutoPlaying(true);
            const {
                moves,
                delayBetweenMoves = 1000,
                pauseAtEnd = 2000,
            } = scenario.autoPlaySequence;

            // Longer delay to show the reset state before any moves
            await new Promise((resolve) => {
                const timeoutId = setTimeout(resolve, 1500);
                timeoutIds.push(timeoutId);
            });

            // Play each move in the sequence
            for (let i = 0; i < moves.length; i++) {
                if (!isActive) break;

                const move = moves[i];

                // Show the path for this move after a brief delay
                if (scenario.autoPlaySequence.showPath !== false) {
                    // Wait a bit before showing the path
                    await new Promise((resolve) => {
                        const timeoutId = setTimeout(resolve, 500);
                        timeoutIds.push(timeoutId);
                    });

                    if (isActive) {
                        try {
                            let pathMoves;

                            // Check if we should show all possible moves or just the trajectory
                            if (scenario.autoPlaySequence.showAllMoves) {
                                // Show all possible moves for this piece
                                pathMoves = coralClash.moves({
                                    square: move.from,
                                    verbose: true,
                                });
                            } else {
                                // Calculate the specific path from source to destination
                                const pathSquares = calculatePath(move.from, move.to);

                                // Create move objects for each square in the path
                                pathMoves = pathSquares.map((square) => ({
                                    to: square,
                                    from: move.from,
                                    san: square,
                                }));
                            }

                            setAutoPlayPathMoves(pathMoves);
                        } catch (error) {
                            console.error('Error getting path moves:', error);
                        }
                    }
                }

                // Wait before executing the move
                await new Promise((resolve) => {
                    const timeoutId = setTimeout(() => {
                        if (isActive) {
                            try {
                                coralClash.move(move);
                                setUpdateCounter((prev) => prev + 1);
                                // Clear the path after the move
                                setAutoPlayPathMoves([]);
                            } catch (error) {
                                console.error('Error playing move:', error);
                            }
                        }
                        resolve();
                    }, delayBetweenMoves);
                    timeoutIds.push(timeoutId);
                });
            }

            // Pause at the end
            await new Promise((resolve) => {
                const timeoutId = setTimeout(resolve, pauseAtEnd);
                timeoutIds.push(timeoutId);
            });

            // Reset to initial state
            if (isActive) {
                try {
                    applyFixture(coralClash, scenario.fixture, { skipValidation: true });
                    setUpdateCounter((prev) => prev + 1);
                    setIsAutoPlaying(false);
                } catch (error) {
                    console.error('Error resetting scenario:', error);
                }

                // Schedule next loop
                const nextLoopTimeout = setTimeout(() => {
                    if (isActive) {
                        playSequence();
                    }
                }, delayBetweenMoves);
                timeoutIds.push(nextLoopTimeout);
            }
        };

        // Start the sequence immediately
        playSequence();

        // Cleanup function
        return () => {
            isActive = false;
            timeoutIds.forEach((id) => clearTimeout(id));
            setIsAutoPlaying(false);
            setAutoPlayPathMoves([]);
        };
    }, [scenario, autoPlayEnabled, coralClash]);

    // Calculate the path squares between two squares
    const calculatePath = (from, to) => {
        const files = 'abcdefgh';
        const fromFile = files.indexOf(from[0]);
        const fromRank = parseInt(from[1]);
        const toFile = files.indexOf(to[0]);
        const toRank = parseInt(to[1]);

        const path = [];
        const fileStep = Math.sign(toFile - fromFile);
        const rankStep = Math.sign(toRank - fromRank);

        let currentFile = fromFile;
        let currentRank = fromRank;

        // Include the starting square and all intermediate squares
        while (currentFile !== toFile || currentRank !== toRank) {
            path.push(files[currentFile] + currentRank);
            if (currentFile !== toFile) currentFile += fileStep;
            if (currentRank !== toRank) currentRank += rankStep;
        }
        // Add the destination square
        path.push(to);

        return path;
    };

    const handleSelectPiece = (square) => {
        // Disable manual selection only when auto-play is enabled and running
        // Allow selection when user has paused auto-play
        if (scenario?.autoPlaySequence && autoPlayEnabled) {
            return;
        }

        if (selectedSquare === square) {
            // Deselect
            setSelectedSquare(null);
            setVisibleMoves([]);
            setShowingMoves(false);
            setSelectedPieceColor(null);
            return;
        }

        try {
            // Get the piece at the selected square
            const piece = coralClash.get(square);
            if (!piece) {
                setSelectedSquare(null);
                setVisibleMoves([]);
                setShowingMoves(false);
                setSelectedPieceColor(null);
                return;
            }

            // Save current turn
            const currentTurn = coralClash.turn();

            // If the piece color doesn't match the current turn, temporarily switch turns
            const needsToggle = piece.color !== currentTurn;
            if (needsToggle) {
                // Temporarily switch turn to get moves for this piece
                coralClash._turn = piece.color;
            }

            const moves = coralClash.moves({ square, verbose: true });

            // Restore original turn
            if (needsToggle) {
                coralClash._turn = currentTurn;
            }

            if (moves && moves.length > 0) {
                setSelectedSquare(square);
                setVisibleMoves(moves);
                setShowingMoves(true);
                setSelectedPieceColor(piece.color);
            } else {
                setSelectedSquare(null);
                setVisibleMoves([]);
                setShowingMoves(false);
                setSelectedPieceColor(null);
            }
        } catch (error) {
            console.error('Error getting moves:', error);
            setSelectedSquare(null);
            setVisibleMoves([]);
            setShowingMoves(false);
            setSelectedPieceColor(null);
        }
    };

    return (
        <LinearGradient
            colors={[colors.GRADIENT_START, colors.GRADIENT_MID, colors.GRADIENT_END]}
            style={styles.gradient}
        >
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Title */}
                <View style={[styles.titleCard, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <Text style={[styles.title, { color: colors.PRIMARY }]}>{scenario.title}</Text>
                    {scenario.autoPlaySequence && (
                        <TouchableOpacity
                            style={[
                                styles.autoPlayToggle,
                                {
                                    backgroundColor: autoPlayEnabled
                                        ? colors.PRIMARY
                                        : colors.MUTED,
                                },
                            ]}
                            onPress={() => setAutoPlayEnabled(!autoPlayEnabled)}
                        >
                            <Icon
                                name={autoPlayEnabled ? 'pause' : 'play'}
                                family='font-awesome'
                                size={16}
                                color='white'
                            />
                            <Text style={styles.autoPlayText}>
                                {autoPlayEnabled ? 'Pause Auto-Play' : 'Play Demo'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Board */}
                <View style={styles.boardContainer}>
                    <View style={{ position: 'relative', alignSelf: 'center' }}>
                        <EmptyBoard size={boardSize} boardFlipped={false} />
                        <Coral
                            coralClash={coralClash}
                            size={boardSize}
                            boardFlipped={false}
                            userColor={null}
                            updateTrigger={updateCounter}
                        />
                        <Pieces
                            board={coralClash.board()}
                            onSelectPiece={handleSelectPiece}
                            size={boardSize}
                            userColor={null}
                            boardFlipped={false}
                        />
                        {/* Show manual selection moves when: no auto-play OR auto-play is paused */}
                        {showingMoves && (!scenario?.autoPlaySequence || !autoPlayEnabled) && (
                            <Moves
                                visibleMoves={visibleMoves}
                                onSelectMove={() => {}}
                                size={boardSize}
                                isEnemyMoves={selectedPieceColor === 'b'}
                                boardFlipped={false}
                                isPlayerTurn={true}
                            />
                        )}
                        {/* Show auto-play path moves only when auto-play is active */}
                        {scenario?.autoPlaySequence &&
                            autoPlayEnabled &&
                            autoPlayPathMoves.length > 0 && (
                                <Moves
                                    visibleMoves={autoPlayPathMoves}
                                    onSelectMove={() => {}}
                                    size={boardSize}
                                    isEnemyMoves={false}
                                    boardFlipped={false}
                                    isPlayerTurn={true}
                                />
                            )}
                    </View>
                </View>

                {/* Description Card */}
                <View style={[styles.descriptionCard, { backgroundColor: colors.CARD_BACKGROUND }]}>
                    <View style={styles.descriptionHeader}>
                        <GalioIcon
                            name='info'
                            family='font-awesome'
                            size={24}
                            color={colors.PRIMARY}
                        />
                        <Text style={[styles.descriptionTitle, { color: colors.TEXT }]}>
                            Explanation
                        </Text>
                    </View>
                    <Text style={[styles.description, { color: colors.TEXT }]}>
                        {scenario.description}
                    </Text>
                </View>

                {/* Back Button */}
                <TouchableOpacity
                    style={[styles.backButton, { backgroundColor: colors.CARD_BACKGROUND }]}
                    onPress={() => navigation.goBack()}
                >
                    <Icon name='arrow-left' family='font-awesome' size={20} color={colors.TEXT} />
                    <Text style={[styles.backButtonText, { color: colors.TEXT }]}>
                        Back to Guide
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: 20,
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    titleCard: {
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        shadowOpacity: 0.2,
        elevation: 3,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    autoPlayToggle: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        marginTop: 12,
        gap: 8,
    },
    autoPlayText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '600',
    },
    boardContainer: {
        marginBottom: 16,
    },
    descriptionCard: {
        borderRadius: 12,
        padding: 20,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        shadowOpacity: 0.2,
        elevation: 3,
    },
    descriptionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 12,
    },
    descriptionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 8,
        gap: 8,
    },
    backButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});
