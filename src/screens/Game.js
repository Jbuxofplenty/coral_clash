import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';

import ComputerCoralClashBoard from '../components/ComputerCoralClashBoard';
import PassAndPlayCoralClashBoard from '../components/PassAndPlayCoralClashBoard';
import PvPCoralClashBoard from '../components/PvPCoralClashBoard';
import { useNotifications, useTheme } from '../contexts';

export default function Game({ route }) {
    const { colors } = useTheme();
    const { gameStatusUpdate, setActiveGameId } = useNotifications();

    // Get game params from route
    const fixture = route?.params?.fixture;
    const gameId = route?.params?.gameId;
    const gameState = route?.params?.gameState;
    const opponentType = route?.params?.opponentType; // 'computer', 'passandplay', or undefined for PvP
    const opponentData = route?.params?.opponentData; // For PvP and pass-and-play games
    const timeControl = route?.params?.timeControl; // For pass-and-play games
    const difficulty = route?.params?.difficulty; // AI difficulty for computer games

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
    }, [
        gameStatusUpdate?.timestamp,
        gameId,
        setStatusMessage,
        setStatusType,
        setShowStatus,
        gameStatusUpdate,
    ]);

    useFocusEffect(
        useCallback(() => {
            // Increment the key to trigger a re-render of the board component
            setFocusKey((prev) => prev + 1);
        }, []),
    );

    // Select the appropriate board component
    // Use ComputerCoralClashBoard for: legacy computer games (displayName === 'Computer' or missing) or offline games
    // Use PassAndPlayCoralClashBoard for: pass-and-play games
    // Use PvPCoralClashBoard for: online PvP games and pseudo-computer users (have displayName like 'Alex', 'Jordan')
    let BoardComponent;
    if (opponentType === 'passandplay') {
        BoardComponent = PassAndPlayCoralClashBoard;
    } else if (!gameId) {
        // Offline game - always use ComputerCoralClashBoard
        BoardComponent = ComputerCoralClashBoard;
    } else if (
        opponentType === 'computer' &&
        (!opponentData?.displayName || opponentData.displayName === 'Computer')
    ) {
        // Legacy computer game (no displayName or displayName === 'Computer')
        BoardComponent = ComputerCoralClashBoard;
    } else {
        // PvP game or pseudo-computer user (opponentType === 'computer' but has a displayName like 'Alex', 'Jordan')
        BoardComponent = PvPCoralClashBoard;
    }

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
                opponentType={opponentType}
                timeControl={timeControl}
                difficulty={difficulty}
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
        flex: 1,
        width: '100%',
    },
});
