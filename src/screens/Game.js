import React, { useState, useEffect } from 'react';
import { Dimensions, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';

import ComputerCoralClashBoard from '../components/ComputerCoralClashBoard';
import PvPCoralClashBoard from '../components/PvPCoralClashBoard';
import { useTheme, useNotifications } from '../contexts';

const { width, height } = Dimensions.get('screen');

export default function Game({ route }) {
    const { colors } = useTheme();
    const { gameStatusUpdate, setActiveGameId } = useNotifications();

    // Get game params from route
    const fixture = route?.params?.fixture;
    const gameId = route?.params?.gameId;
    const gameState = route?.params?.gameState;
    const opponentType = route?.params?.opponentType; // 'computer' or undefined for PvP
    const opponentData = route?.params?.opponentData; // For PvP games

    // Use a key that changes when the screen comes into focus to force timer re-sync
    const [focusKey, setFocusKey] = useState(0);
    const [statusMessage, setStatusMessage] = useState(null);
    const [statusType, setStatusType] = useState('info');
    const [showStatus, setShowStatus] = useState(false);

    // Set active game ID for notification filtering
    useEffect(() => {
        if (gameId) {
            setActiveGameId(gameId);
        }
        return () => setActiveGameId(null);
    }, [gameId, setActiveGameId]);

    // Handle game status updates
    useEffect(() => {
        if (!gameStatusUpdate || gameStatusUpdate.gameId !== gameId) return;

        const messageConfig = {
            reset_approved: { message: 'Game has been reset', type: 'success' },
            reset_rejected: { message: 'Reset request declined', type: 'error' },
            undo_approved: { message: 'Move undone', type: 'success' },
            undo_rejected: { message: 'Undo request declined', type: 'error' },
        };

        const config = messageConfig[gameStatusUpdate.type];

        if (config) {
            setStatusMessage(config.message);
            setStatusType(config.type);
            setShowStatus(true);
        }
    }, [gameStatusUpdate?.timestamp, gameId]);

    useFocusEffect(
        React.useCallback(() => {
            // Increment the key to trigger a re-render of the board component
            setFocusKey((prev) => prev + 1);
        }, []),
    );

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
            <BoardComponent
                key={focusKey}
                fixture={fixture}
                gameId={gameId}
                gameState={gameState}
                opponentData={opponentData}
                notificationStatus={
                    showStatus && statusMessage
                        ? {
                              message: statusMessage,
                              type: statusType,
                              timeout: 3000,
                              onDismiss: () => setShowStatus(false),
                          }
                        : null
                }
            />
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    game: {
        width: width,
        height: height,
    },
});
