import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Block } from 'galio-framework';
import CoralClash from '../components/CoralClashBoard';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('screen');

export default function Game({ route }) {
    const { colors } = useTheme();
    // Get game params from route
    const fixture = route?.params?.fixture;
    const gameId = route?.params?.gameId;
    const gameState = route?.params?.gameState;

    return (
        <LinearGradient
            colors={[colors.GRADIENT_START, colors.GRADIENT_MID, colors.GRADIENT_END]}
            style={styles.game}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <Block flex>
                <CoralClash fixture={fixture} gameId={gameId} gameState={gameState} />
            </Block>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    game: {
        width: width,
        height: height,
    },
});
