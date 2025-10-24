import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    useWindowDimensions,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Icon as GalioIcon } from 'galio-framework';
import { useTheme } from '../contexts';
import { useCoralClash } from '../hooks';
import { applyFixture } from '../../shared';
import EmptyBoard from '../components/EmptyBoard';
import Pieces from '../components/Pieces';
import Coral from '../components/Coral';
import Moves from '../components/Moves';
import { Icon } from '../components';

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

    // Calculate board size
    const boardSize = Math.min(width * 0.95, SCREEN_HEIGHT * 0.5);

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
    }, [scenario]);

    const handleSelectPiece = (square) => {
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
                        {showingMoves && (
                            <Moves
                                visibleMoves={visibleMoves}
                                onSelectMove={() => {}}
                                size={boardSize}
                                isEnemyMoves={selectedPieceColor === 'b'}
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
