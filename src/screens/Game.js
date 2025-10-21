import React from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Block } from 'galio-framework';
import CoralClash from '../components/CoralClashBoard';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('screen');

export default function Game({ route }) {
    const { colors } = useTheme();
    // Get fixture from route params if available
    const fixture = route?.params?.fixture;

    return (
        <LinearGradient
            colors={[colors.GRADIENT_START, colors.GRADIENT_MID, colors.GRADIENT_END]}
            style={styles.game}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <Block flex>
                <CoralClash fixture={fixture} />
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
