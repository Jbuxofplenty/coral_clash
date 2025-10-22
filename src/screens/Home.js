import { theme } from 'galio-framework';
import React, { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import { GameModeCard, ActiveGamesCard, GameHistoryCard } from '../components/';
import FixtureLoaderModal from '../components/FixtureLoaderModal';
import { useTheme } from '../contexts/ThemeContext';
import { useGame } from '../hooks/useGame';
import { useAuth } from '../contexts/AuthContext';

const { width, height } = Dimensions.get('screen');

// Check if dev features are enabled
const enableDevFeatures = process.env.EXPO_PUBLIC_ENABLE_DEV_FEATURES === 'true';

export default function Home({ navigation }) {
    const { colors } = useTheme();
    const { user } = useAuth();
    const [fixtureModalVisible, setFixtureModalVisible] = useState(false);
    const { startComputerGame, activeGames, loadActiveGames } = useGame();

    // Load active games when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            if (user) {
                loadActiveGames();
            }
        }, [user, loadActiveGames]),
    );

    const handleStartComputerGame = async () => {
        try {
            const result = await startComputerGame();
            if (result.gameId) {
                navigation.navigate('Game', { gameId: result.gameId });
            }
        } catch (error) {
            console.error('Failed to start computer game:', error);
        }
    };

    const handleOpenFixtureLoader = () => {
        setFixtureModalVisible(true);
    };

    const handleSelectFixture = (fixture, fixtureName) => {
        console.log('Loading fixture:', fixtureName);
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
                <GameHistoryCard navigation={navigation} />
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
