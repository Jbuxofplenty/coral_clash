import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Block } from 'galio-framework';
import ComputerCoralClashBoard from '../components/ComputerCoralClashBoard';
import PvPCoralClashBoard from '../components/PvPCoralClashBoard';
import { useTheme } from '../contexts/ThemeContext';

const { width, height } = Dimensions.get('screen');

export default function Game({ route }) {
    const { colors } = useTheme();
    // Get game params from route
    const fixture = route?.params?.fixture;
    const gameId = route?.params?.gameId;
    const gameState = route?.params?.gameState;
    const opponentType = route?.params?.opponentType; // 'computer' or undefined for PvP
    const opponentData = route?.params?.opponentData; // For PvP games

    // Select the appropriate board component
    const BoardComponent =
        opponentType === 'computer' || !gameId ? ComputerCoralClashBoard : PvPCoralClashBoard;

    return (
        <LinearGradient
            colors={[colors.GRADIENT_START, colors.GRADIENT_MID, colors.GRADIENT_END]}
            style={styles.game}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
        >
            <Block flex>
                <BoardComponent
                    fixture={fixture}
                    gameId={gameId}
                    gameState={gameState}
                    opponentData={opponentData}
                />
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
