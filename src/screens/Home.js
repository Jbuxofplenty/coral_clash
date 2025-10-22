import { theme } from 'galio-framework';
import React, { useState, useEffect } from 'react';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { GameModeCard, ActiveGamesCard, GameHistoryCard } from '../components/';
import FixtureLoaderModal from '../components/FixtureLoaderModal';
import { useTheme } from '../contexts/ThemeContext';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../contexts/AuthContext';
import { useFirebaseFunctions } from '../hooks/useFirebaseFunctions';
import { db, collection, query, where, onSnapshot } from '../config/firebase';

const { width, height } = Dimensions.get('screen');

// Check if dev features are enabled
const enableDevFeatures = process.env.EXPO_PUBLIC_ENABLE_DEV_FEATURES === 'true';

export default function Home({ navigation }) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const [fixtureModalVisible, setFixtureModalVisible] = useState(false);
    const [gameHistory, setGameHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const { startComputerGame, activeGames } = useGame(); // useGame now handles listeners internally
    const { getGameHistory } = useFirebaseFunctions();

    // Initial load and set up game history listeners on mount
    useEffect(() => {
        if (!user || !user.uid) {
            setHistoryLoading(false);
            return;
        }

        // Initial load
        const initialLoad = async () => {
            try {
                const result = await getGameHistory();
                setGameHistory(result.games || []);
            } catch (error) {
                console.error('[Home] Error loading game history:', error);
            } finally {
                setHistoryLoading(false);
            }
        };

        initialLoad();

        // Listen to completed/cancelled games where user is creator
        const historyCreatorQuery = query(
            collection(db, 'games'),
            where('creatorId', '==', user.uid),
            where('status', 'in', ['completed', 'cancelled']),
        );

        // Listen to completed/cancelled games where user is opponent
        const historyOpponentQuery = query(
            collection(db, 'games'),
            where('opponentId', '==', user.uid),
            where('status', 'in', ['completed', 'cancelled']),
        );

        const historyCreatorUnsubscribe = onSnapshot(historyCreatorQuery, async () => {
            try {
                const result = await getGameHistory();
                setGameHistory(result.games || []);
            } catch (error) {
                console.error('[Home] Error fetching game history:', error);
            }
        });

        const historyOpponentUnsubscribe = onSnapshot(historyOpponentQuery, async () => {
            try {
                const result = await getGameHistory();
                setGameHistory(result.games || []);
            } catch (error) {
                console.error('[Home] Error fetching game history:', error);
            }
        });

        // Cleanup on unmount
        return () => {
            historyCreatorUnsubscribe();
            historyOpponentUnsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const handleStartComputerGame = async () => {
        try {
            const result = await startComputerGame();
            if (result.success) {
                // Navigate to game screen
                // If gameId is null, it's an offline game
                navigation.navigate('Game', {
                    gameId: result.gameId || null,
                    opponentType: 'computer',
                });
            }
        } catch (error) {
            console.error('Failed to start computer game:', error);
        }
    };

    const handleOpenFixtureLoader = () => {
        setFixtureModalVisible(true);
    };

    const handleSelectFixture = (fixture, fixtureName) => {
        // Navigate to game with the fixture
        navigation.navigate('Game', {
            fixture: fixture,
            fixtureName: fixtureName,
        });
    };

    return (
        <LinearGradient
            colors={[colors.GRADIENT_START, colors.GRADIENT_MID, colors.GRADIENT_END]}
            style={styles.gradient}
        >
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={styles.scrollView}
            >
                {/* Active Games Card - show at top if there are games */}
                {activeGames.length > 0 && <ActiveGamesCard navigation={navigation} />}

                {/* Game Mode Cards */}
                <GameModeCard
                    title='Play vs Computer'
                    description='Start a new game against the AI'
                    icon='desktop'
                    iconFamily='font-awesome'
                    onPress={handleStartComputerGame}
                />

                {enableDevFeatures && (
                    <GameModeCard
                        title='Load Game State (Dev)'
                        description='Load a saved game state from fixtures'
                        icon='folder-open'
                        iconFamily='font-awesome'
                        onPress={handleOpenFixtureLoader}
                    />
                )}

                {/* Active Games Card - show at bottom if there are no games */}
                {activeGames.length === 0 && <ActiveGamesCard navigation={navigation} />}

                {/* Game History Card */}
                <GameHistoryCard
                    navigation={navigation}
                    gameHistory={gameHistory}
                    loading={historyLoading}
                />
            </ScrollView>

            <FixtureLoaderModal
                visible={fixtureModalVisible}
                onClose={() => setFixtureModalVisible(false)}
                onSelectFixture={handleSelectFixture}
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    gradient: {
        flex: 1,
        width: width,
        height: height,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingVertical: theme.SIZES.BASE * 2,
        paddingHorizontal: theme.SIZES.BASE,
        paddingBottom: theme.SIZES.BASE * 3,
    },
});
