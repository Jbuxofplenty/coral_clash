import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Alert, Text } from 'react-native';
import { Icon } from 'galio-framework';
import BaseCoralClashBoard, { baseStyles } from './BaseCoralClashBoard';
import { useAuth } from '../contexts/AuthContext';
import { useGamePreferences } from '../contexts/GamePreferencesContext';
import useFirebaseFunctions from '../hooks/useFirebaseFunctions';
import { db, doc, onSnapshot } from '../config/firebase';

/**
 * PvPCoralClashBoard - Board for player vs player games
 * Extends BaseCoralClashBoard with:
 * - No undo (requires opponent consent)
 * - Reset requires opponent approval
 * - Real-time sync via Firestore
 */
const PvPCoralClashBoard = ({ fixture, gameId, gameState, opponentData }) => {
    const { user } = useAuth();
    const { isBoardFlipped } = useGamePreferences();
    const { requestGameReset, requestUndo } = useFirebaseFunctions();
    const [userColor, setUserColor] = useState(null);
    const [creatorId, setCreatorId] = useState(null);
    const [opponentId, setOpponentId] = useState(null);

    // Determine user's color from game document
    useEffect(() => {
        if (!gameId || !user) return;

        const unsubscribe = onSnapshot(
            doc(db, 'games', gameId),
            (docSnap) => {
                if (docSnap.exists()) {
                    const gameData = docSnap.data();
                    setCreatorId(gameData.creatorId);
                    setOpponentId(gameData.opponentId);

                    // Creator is white, opponent is black
                    const color = gameData.creatorId === user.uid ? 'w' : 'b';
                    setUserColor(color);
                }
            },
            (error) => {
                console.error('Error listening to game for user color:', error);
            },
        );

        return () => unsubscribe();
    }, [gameId, user]);

    // PvP-specific: Render control buttons (menu and history navigation)
    const renderControls = ({
        openMenu,
        colors,
        canGoBack,
        canGoForward,
        handleHistoryBack,
        handleHistoryForward,
    }) => (
        <View style={baseStyles.controlBar}>
            <TouchableOpacity
                style={baseStyles.controlButton}
                onPress={openMenu}
                activeOpacity={0.7}
            >
                <Icon name='menu' family='MaterialIcons' size={44} color={colors.WHITE} />
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <TouchableOpacity
                    style={baseStyles.controlButton}
                    onPress={handleHistoryBack}
                    disabled={!canGoBack}
                    activeOpacity={0.7}
                >
                    <Icon
                        name='chevron-left'
                        family='MaterialIcons'
                        size={44}
                        color={canGoBack ? colors.WHITE : colors.MUTED}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={[baseStyles.controlButton, { marginLeft: 8 }]}
                    onPress={handleHistoryForward}
                    disabled={!canGoForward}
                    activeOpacity={0.7}
                >
                    <Icon
                        name='chevron-right'
                        family='MaterialIcons'
                        size={44}
                        color={canGoForward ? colors.WHITE : colors.MUTED}
                    />
                </TouchableOpacity>
            </View>
        </View>
    );

    // PvP-specific: Render menu items (undo request and reset request)
    const renderMenuItems = ({ closeMenu, coralClash, colors, styles }) => {
        const isGameOver = coralClash.isGameOver();
        const historyLength = coralClash.history().length;
        const canRequestUndo = historyLength >= 2 && !isGameOver;

        const handleUndoRequest = async () => {
            closeMenu();

            Alert.alert(
                'Request Undo',
                `Request to undo the last move? ${opponentData?.displayName || 'Your opponent'} will need to approve.`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Request',
                        onPress: async () => {
                            try {
                                // Undo 2 moves in PvP (one from each player)
                                await requestUndo({ gameId, moveCount: 2 });
                                Alert.alert(
                                    'Request Sent',
                                    'Your opponent will be notified of your undo request.',
                                );
                            } catch (error) {
                                console.error('Error requesting undo:', error);
                                Alert.alert(
                                    'Error',
                                    'Failed to send undo request. Please try again.',
                                );
                            }
                        },
                    },
                ],
            );
        };

        const handleResetRequest = async () => {
            closeMenu();

            Alert.alert(
                'Request Reset',
                `Request to reset this game? ${opponentData?.displayName || 'Your opponent'} will need to approve.`,
                [
                    {
                        text: 'Cancel',
                        style: 'cancel',
                    },
                    {
                        text: 'Request',
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await requestGameReset({ gameId });
                                Alert.alert(
                                    'Request Sent',
                                    'Your opponent will be notified of your reset request.',
                                );
                            } catch (error) {
                                console.error('Error requesting reset:', error);
                                Alert.alert(
                                    'Error',
                                    'Failed to send reset request. Please try again.',
                                );
                            }
                        },
                    },
                ],
            );
        };

        return (
            <>
                {/* Undo Request */}
                <TouchableOpacity
                    style={[
                        styles.menuItem,
                        {
                            borderBottomColor: colors.BORDER_COLOR,
                            opacity: canRequestUndo ? 1 : 0.5,
                        },
                    ]}
                    onPress={handleUndoRequest}
                    disabled={!canRequestUndo}
                    activeOpacity={0.7}
                >
                    <Icon
                        name='undo'
                        family='MaterialIcons'
                        size={28}
                        color={canRequestUndo ? '#2196f3' : colors.MUTED}
                    />
                    <View style={styles.menuItemText}>
                        <Text style={[styles.menuItemTitle, { color: colors.TEXT }]}>
                            Request Undo
                        </Text>
                        <Text style={[styles.menuItemSubtitle, { color: colors.TEXT_SECONDARY }]}>
                            {!canRequestUndo && historyLength < 2
                                ? 'Not enough moves to undo'
                                : isGameOver
                                  ? 'Game already ended'
                                  : 'Ask opponent to undo last move'}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Reset Request */}
                <TouchableOpacity
                    style={[
                        styles.menuItem,
                        { borderBottomColor: colors.BORDER_COLOR, opacity: isGameOver ? 0.5 : 1 },
                    ]}
                    onPress={handleResetRequest}
                    disabled={isGameOver}
                    activeOpacity={0.7}
                >
                    <Icon
                        name='refresh'
                        family='MaterialIcons'
                        size={28}
                        color={isGameOver ? colors.MUTED : '#f57c00'}
                    />
                    <View style={styles.menuItemText}>
                        <Text style={[styles.menuItemTitle, { color: colors.TEXT }]}>
                            Request Reset
                        </Text>
                        <Text style={[styles.menuItemSubtitle, { color: colors.TEXT_SECONDARY }]}>
                            {isGameOver ? 'Game already ended' : 'Ask opponent to reset the game'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </>
        );
    };

    // Determine which player is on top/bottom
    // User should always see themselves at bottom unless board is manually flipped
    // userColor: 'w' = white (rows 1-2), 'b' = black (rows 7-8)
    // Without flip: white at bottom (normal), black at top
    // With flip: black at bottom, white at top

    // Determine if user is playing as black
    const userIsBlack = userColor === 'b';

    // Board should be flipped if:
    // - User is black AND board is NOT manually flipped, OR
    // - User is white AND board IS manually flipped
    const shouldFlipBoard = userIsBlack !== isBoardFlipped;

    // Get opponent info from game data or from creatorId/opponentId
    let opponentName = opponentData?.displayName || 'Opponent';
    let opponentAvatar = opponentData?.avatarKey || 'dolphin';

    const topPlayer = shouldFlipBoard
        ? {
              name: opponentName,
              avatarKey: opponentAvatar,
              isComputer: false,
          }
        : {
              name: user?.displayName || 'Player',
              avatarKey: user?.avatarKey,
              isComputer: false,
          };

    const bottomPlayer = shouldFlipBoard
        ? {
              name: user?.displayName || 'Player',
              avatarKey: user?.avatarKey,
              isComputer: false,
          }
        : {
              name: opponentName,
              avatarKey: opponentAvatar,
              isComputer: false,
          };

    return (
        <BaseCoralClashBoard
            fixture={fixture}
            gameId={gameId}
            gameState={gameState}
            opponentType='pvp'
            topPlayerData={topPlayer}
            bottomPlayerData={bottomPlayer}
            renderControls={renderControls}
            renderMenuItems={renderMenuItems}
            onMoveComplete={undefined} // No special move handling for PvP
            enableUndo={false}
            onUndo={undefined}
            userColor={userColor}
            effectiveBoardFlip={shouldFlipBoard}
        />
    );
};

export default PvPCoralClashBoard;
