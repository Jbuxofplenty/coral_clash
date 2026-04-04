import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import ComputerCoralClashBoard from '../components/ComputerCoralClashBoard';
import PassAndPlayCoralClashBoard from '../components/PassAndPlayCoralClashBoard';
import PvPCoralClashBoard from '../components/PvPCoralClashBoard';
import { useAlert, useNotifications, useTheme } from '../contexts';

export default function Game({ route }) {
    const { t } = useTranslation();
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
    const isEndGameTutorial = route?.params?.isEndGameTutorial; // End-game tutorial flag

    // Use a key that changes when the screen comes into focus to force timer re-sync
    const [focusKey, setFocusKey] = useState(0);
    const [statusMessage, setStatusMessage] = useState(null);
    const [statusType, setStatusType] = useState('info');
    const [showStatus, setShowStatus] = useState(false);
    const [isGameOver, setIsGameOver] = useState(false);
    const { showAlert } = useAlert(); // Need this if not already in Game.js... wait, it's not. I must check. Let me just add the hook call here and we'll import it above if missing in the next step.
    
    // Set active game ID for notification filtering
    useEffect(() => {
        if (gameId) {
            setActiveGameId(gameId);
        }
        return () => setActiveGameId(null);
    }, [gameId, setActiveGameId]);

    // Floating animation for tutorial tooltip (shown only after game over)
    const floatAnim = React.useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isEndGameTutorial && isGameOver) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(floatAnim, {
                        toValue: 1,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                    Animated.timing(floatAnim, {
                        toValue: 0,
                        duration: 800,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        }
    }, [isEndGameTutorial, isGameOver, floatAnim]);

    const translateY = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -8],
    });

    const handleGameOver = useCallback(() => {
        setIsGameOver(true);
    }, []);

    const alertShown = React.useRef(false);
    // End-game tutorial welcome popup
    useEffect(() => {
        if (isEndGameTutorial && !alertShown.current) {
            alertShown.current = true;
            showAlert(
                t('tutorial.endGame.title', 'Finish the Game!'),
                t('tutorial.endGame.message', 'The Whale is the King. You can win by either checkmating the Black Whale, or by placing all 17 of your corals!'),
            );
        }
    }, [isEndGameTutorial, showAlert, t]);

    // Handle game status updates
    useEffect(() => {
        if (!gameStatusUpdate || gameStatusUpdate.gameId !== gameId) return;

        const messageConfig = {
            reset_approved: { message: t('game.status.resetApproved'), type: 'success' },
            reset_rejected: { message: t('game.status.resetRejected'), type: 'error' },
            undo_approved: { message: t('game.status.undoApproved'), type: 'success' },
            undo_rejected: { message: t('game.status.undoRejected'), type: 'error' },
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
        t,
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
            {isEndGameTutorial && isGameOver && (
                <View style={styles.tutorialTooltip} pointerEvents="none">
                    <Animated.Text style={[styles.fingerEmoji, { transform: [{ translateY }] }]}>
                        ☝️
                    </Animated.Text>
                    <View style={styles.tooltipBubble}>
                        <Text style={styles.tooltipText}>
                            {t('tutorial.endGame.backInfo', 'Tap the arrow to return to the home screen')}
                        </Text>
                    </View>
                </View>
            )}
            <BoardComponent
                key={focusKey}
                fixture={fixture}
                gameId={gameId}
                gameState={gameState}
                opponentData={opponentData}
                opponentType={opponentType}
                timeControl={timeControl}
                difficulty={difficulty}
                onGameOver={isEndGameTutorial ? handleGameOver : undefined}
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
    tutorialTooltip: {
        position: 'absolute',
        top: 2,
        left: 10,
        zIndex: 100,
        alignItems: 'flex-start',
    },
    fingerEmoji: {
        fontSize: 28,
        marginLeft: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.4)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    tooltipBubble: {
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 12,
        maxWidth: 210,
        marginTop: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
    },
    tooltipText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
        textAlign: 'center',
    },
});
