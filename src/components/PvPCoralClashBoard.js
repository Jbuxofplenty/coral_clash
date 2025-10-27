import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Alert, Text, Dimensions, Platform } from 'react-native';
import { Icon } from 'galio-framework';
import BaseCoralClashBoard, { baseStyles } from './BaseCoralClashBoard';
import { useAuth, useGamePreferences, useTheme, useAlert } from '../contexts';
import { useFirebaseFunctions } from '../hooks';
import { db, doc, onSnapshot } from '../config/firebase';
import IconComponent from './Icon';
import { calculateUndoMoveCount } from '../../shared';

/**
 * Format display name with discriminator
 * @param {string} displayName - The display name
 * @param {string} discriminator - The 4-digit discriminator
 * @returns {string} Formatted name like "Username #1234"
 */
const formatDisplayName = (displayName, discriminator) => {
    if (!displayName) {
        return 'Player';
    }
    if (!discriminator) {
        return displayName;
    }
    return `${displayName} #${discriminator}`;
};

/**
 * PvPCoralClashBoard - Board for player vs player games
 * Extends BaseCoralClashBoard with:
 * - No undo (requires opponent consent)
 * - Reset requires opponent approval
 * - Real-time sync via Firestore
 */
const PvPCoralClashBoard = ({ fixture, gameId, gameState, opponentData, notificationStatus }) => {
    const { user } = useAuth();
    const { isBoardFlipped } = useGamePreferences();
    const { colors } = useTheme();
    const { showAlert } = useAlert();
    const { requestGameReset, requestUndo, respondToUndoRequest, respondToResetRequest } =
        useFirebaseFunctions();
    const [userColor, setUserColor] = useState(null);
    const [creatorId, setCreatorId] = useState(null);
    const [opponentId, setOpponentId] = useState(null);
    const [undoRequestData, setUndoRequestData] = useState(null);
    const [resetRequestData, setResetRequestData] = useState(null);
    const [currentMoveCount, setCurrentMoveCount] = useState(0); // Track move count from Firestore
    const [liveOpponentData, setLiveOpponentData] = useState(opponentData); // Track live opponent data

    // Listen to game document for user color, requests, and opponent snapshot data
    useEffect(() => {
        if (!gameId || !user) return;

        const unsubscribe = onSnapshot(
            doc(db, 'games', gameId),
            (docSnap) => {
                if (docSnap.exists()) {
                    const gameData = docSnap.data();
                    setCreatorId(gameData.creatorId);
                    setOpponentId(gameData.opponentId);

                    // Track current move count for dynamic undo calculation
                    const moveHistoryLength = gameData.moves?.length || 0;
                    setCurrentMoveCount(moveHistoryLength);

                    // Determine user's color from whitePlayerId/blackPlayerId
                    // Fall back to old logic (creator=white) for backward compatibility
                    let color;
                    if (gameData.whitePlayerId && gameData.blackPlayerId) {
                        color = gameData.whitePlayerId === user.uid ? 'w' : 'b';
                    } else {
                        // Backward compatibility: creator is white, opponent is black
                        color = gameData.creatorId === user.uid ? 'w' : 'b';
                    }
                    setUserColor(color);

                    // Track undo request status
                    if (gameData.undoRequestedBy && gameData.undoRequestStatus === 'pending') {
                        setUndoRequestData({
                            requestedBy: gameData.undoRequestedBy,
                            moveCount: gameData.undoRequestMoveCount || 1,
                            undoRequestAtMoveNumber: gameData.undoRequestAtMoveNumber,
                            isUserTheRequester: gameData.undoRequestedBy === user.uid,
                        });
                    } else {
                        setUndoRequestData(null);
                    }

                    // Track reset request status
                    if (gameData.resetRequestedBy && gameData.resetRequestStatus === 'pending') {
                        setResetRequestData({
                            requestedBy: gameData.resetRequestedBy,
                            isUserTheRequester: gameData.resetRequestedBy === user.uid,
                        });
                    } else {
                        setResetRequestData(null);
                    }

                    // Update opponent snapshot data from game document
                    // We want to show the opponent's avatar as it was when the game was created
                    const isCreator = gameData.creatorId === user.uid;
                    const opponentDisplayName = isCreator
                        ? gameData.opponentDisplayName
                        : gameData.creatorDisplayName;
                    const opponentAvatarKey = isCreator
                        ? gameData.opponentAvatarKey
                        : gameData.creatorAvatarKey;

                    if (opponentDisplayName && opponentAvatarKey) {
                        setLiveOpponentData({
                            id: gameData.opponentId,
                            displayName: opponentDisplayName,
                            avatarKey: opponentAvatarKey,
                        });
                    }
                }
            },
            (error) => {
                console.error('Error listening to game document:', error);
            },
        );

        return () => unsubscribe();
    }, [gameId, user]);

    // Handler for undo request from control bar
    const handleUndoRequest = async () => {
        showAlert(
            'Request Undo',
            `Request to undo the last move? ${liveOpponentData?.displayName || 'Your opponent'} will need to approve.`,
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Request',
                    onPress: async () => {
                        try {
                            // Undo just the last move (the player's own move)
                            await requestUndo({ gameId, moveCount: 1 });
                            showAlert(
                                'Request Sent',
                                'Your opponent will be notified of your undo request.',
                            );
                        } catch (error) {
                            console.error('Error requesting undo:', error);
                            showAlert('Error', 'Failed to send undo request. Please try again.');
                        }
                    },
                },
            ],
        );
    };

    // Handler for responding to undo request
    const handleUndoResponse = async (approve) => {
        try {
            await respondToUndoRequest({ gameId, approve });
            // No need to show alert - the banner will disappear automatically via Firestore listener
        } catch (error) {
            console.error('Error responding to undo request:', error);
            showAlert('Error', 'Failed to respond to undo request. Please try again.');
        }
    };

    // Handler for responding to reset request
    const handleResetResponse = async (approve) => {
        try {
            await respondToResetRequest({ gameId, approve });
            // No need to show alert - the banner will disappear automatically via Firestore listener
        } catch (error) {
            console.error('Error responding to reset request:', error);
            showAlert('Error', 'Failed to respond to reset request. Please try again.');
        }
    };

    // Handler for canceling undo request
    const handleCancelUndoRequest = async () => {
        try {
            // Cancel by declining your own request
            await respondToUndoRequest({ gameId, approve: false });
        } catch (error) {
            console.error('Error canceling undo request:', error);
            showAlert('Error', 'Failed to cancel undo request. Please try again.');
        }
    };

    // Handler for canceling reset request
    const handleCancelResetRequest = async () => {
        try {
            // Cancel by declining your own request
            await respondToResetRequest({ gameId, approve: false });
        } catch (error) {
            console.error('Error canceling reset request:', error);
            showAlert('Error', 'Failed to cancel reset request. Please try again.');
        }
    };

    // PvP-specific: Render control buttons (menu, undo, and history navigation)
    const renderControls = ({
        openMenu,
        colors,
        canGoBack,
        canGoForward,
        handleHistoryBack,
        handleHistoryForward,
        coralClash,
        isViewingHistory,
        gameData,
    }) => {
        const historyLength = coralClash.history().length;
        // Check both local game engine state AND server-side completion status (e.g., timeout)
        const isGameOver = coralClash.isGameOver() || gameData?.status === 'completed';
        // Disable undo if game is over, viewing history, no moves, or if there's a pending reset request
        const canRequestUndo =
            historyLength >= 1 && !isGameOver && !isViewingHistory && !resetRequestData;

        return (
            <View style={baseStyles.controlBar}>
                <TouchableOpacity
                    style={baseStyles.controlButton}
                    onPress={openMenu}
                    activeOpacity={0.7}
                >
                    <Icon name='menu' family='MaterialIcons' size={44} color={colors.WHITE} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={baseStyles.controlButton}
                    onPress={handleUndoRequest}
                    disabled={!canRequestUndo}
                    activeOpacity={0.7}
                >
                    <Icon
                        name='undo'
                        family='MaterialIcons'
                        size={44}
                        color={canRequestUndo ? colors.WHITE : colors.MUTED}
                    />
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
    };

    // PvP-specific: Render menu items (reset request and resign)
    const renderMenuItems = ({ closeMenu, coralClash, colors, styles, gameData }) => {
        // Check both local game engine state AND server-side completion status (e.g., timeout)
        const isGameOver = coralClash.isGameOver() || gameData?.status === 'completed';
        const moveHistory = coralClash.history();
        const noMovesYet = moveHistory.length === 0;

        const handleResetRequest = async () => {
            closeMenu();

            // Wait for menu animation to complete before showing alert
            await new Promise((resolve) => setTimeout(resolve, 300));

            showAlert(
                'Request Reset',
                `Request to reset this game? ${liveOpponentData?.displayName || 'Your opponent'} will need to approve.`,
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
                                showAlert(
                                    'Request Sent',
                                    'Your opponent will be notified of your reset request.',
                                );
                            } catch (error) {
                                console.error('Error requesting reset:', error);
                                showAlert(
                                    'Error',
                                    'Failed to send reset request. Please try again.',
                                );
                            }
                        },
                    },
                ],
            );
        };

        // Disable reset if game is over, no moves yet, or if there's a pending undo request
        const isResetDisabled = isGameOver || noMovesYet || undoRequestData;
        let resetSubtitle = 'Ask opponent to reset the game';
        if (isGameOver) {
            resetSubtitle = 'Game already ended';
        } else if (noMovesYet) {
            resetSubtitle = 'No moves have been made yet';
        } else if (undoRequestData) {
            resetSubtitle = 'Pending undo request must be resolved first';
        }

        return (
            <>
                {/* Reset Request */}
                <TouchableOpacity
                    style={[
                        styles.menuItem,
                        {
                            borderBottomColor: colors.BORDER_COLOR,
                            opacity: isResetDisabled ? 0.5 : 1,
                        },
                    ]}
                    onPress={handleResetRequest}
                    disabled={isResetDisabled}
                    activeOpacity={0.7}
                >
                    <Icon
                        name='refresh'
                        family='MaterialIcons'
                        size={28}
                        color={isResetDisabled ? colors.MUTED : '#f57c00'}
                    />
                    <View style={styles.menuItemText}>
                        <Text
                            style={[
                                styles.menuItemTitle,
                                {
                                    color: isResetDisabled ? colors.MUTED : colors.TEXT,
                                },
                            ]}
                        >
                            Request Reset
                        </Text>
                        <Text style={[styles.menuItemSubtitle, { color: colors.TEXT_SECONDARY }]}>
                            {resetSubtitle}
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

    // Get opponent info from game data (already formatted with discriminator from backend)
    let opponentName = liveOpponentData?.displayName || 'Opponent';
    let opponentAvatar = liveOpponentData?.avatarKey || 'dolphin';

    // Format current user's name with discriminator
    // Use fallback if discriminator hasn't loaded yet
    const userName = formatDisplayName(user?.displayName, user?.discriminator);

    // User should ALWAYS see themselves at bottom, opponent at top
    // The board flip only affects visual rendering, not player positions
    const topPlayer = {
        name: opponentName,
        avatarKey: opponentAvatar,
        isComputer: false,
    };

    const bottomPlayer = {
        name: userName,
        avatarKey: user?.settings?.avatarKey || 'dolphin',
        isComputer: false,
    };

    // Render game request banner (undo or reset) - placed below bottom player status bar
    const renderGameRequestBanner = ({ coralClash }) => {
        // Priority: Show undo request first, then reset request
        if (undoRequestData) {
            // Calculate dynamic move count based on current game state using shared logic
            // Use currentMoveCount from Firestore listener instead of coralClash.history().length
            // to ensure we have the latest value from the server
            const dynamicMoveCount = calculateUndoMoveCount(
                undoRequestData.moveCount,
                undoRequestData.undoRequestAtMoveNumber,
                currentMoveCount,
            );

            if (undoRequestData.isUserTheRequester) {
                // User sent the undo request - show waiting banner with cancel option
                return (
                    <View
                        style={{
                            backgroundColor: colors.INPUT,
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Text
                            style={{
                                color: colors.TEXT,
                                fontSize: 15,
                                fontWeight: '600',
                                flex: 1,
                                marginRight: 12,
                            }}
                        >
                            Waiting for {liveOpponentData?.displayName || 'opponent'} to respond to
                            undo {dynamicMoveCount} move(s) request...
                        </Text>
                        <TouchableOpacity
                            onPress={handleCancelUndoRequest}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: colors.ERROR + '15',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <IconComponent
                                name='times'
                                family='font-awesome'
                                size={18}
                                color={colors.ERROR}
                            />
                        </TouchableOpacity>
                    </View>
                );
            } else {
                // Opponent sent undo request - show approval banner with icon buttons
                return (
                    <View
                        style={{
                            backgroundColor: colors.INPUT,
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Text
                            style={{
                                color: colors.TEXT,
                                fontSize: 15,
                                fontWeight: '600',
                                flex: 1,
                                marginRight: 12,
                            }}
                        >
                            {liveOpponentData?.displayName || 'Opponent'} wants to undo{' '}
                            {dynamicMoveCount} move(s)
                        </Text>
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity
                                onPress={() => handleUndoResponse(false)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: colors.ERROR + '15',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <IconComponent
                                    name='times'
                                    family='font-awesome'
                                    size={18}
                                    color={colors.ERROR}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleUndoResponse(true)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: colors.SUCCESS + '15',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginLeft: 10,
                                }}
                            >
                                <IconComponent
                                    name='check'
                                    family='font-awesome'
                                    size={18}
                                    color={colors.SUCCESS}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            }
        }

        if (resetRequestData) {
            if (resetRequestData.isUserTheRequester) {
                // User sent the reset request - show waiting banner with cancel option
                return (
                    <View
                        style={{
                            backgroundColor: colors.INPUT,
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Text
                            style={{
                                color: colors.TEXT,
                                fontSize: 15,
                                fontWeight: '600',
                                flex: 1,
                                marginRight: 12,
                            }}
                        >
                            Waiting for {liveOpponentData?.displayName || 'opponent'} to respond to
                            reset request...
                        </Text>
                        <TouchableOpacity
                            onPress={handleCancelResetRequest}
                            style={{
                                width: 40,
                                height: 40,
                                borderRadius: 20,
                                backgroundColor: colors.ERROR + '15',
                                justifyContent: 'center',
                                alignItems: 'center',
                            }}
                        >
                            <IconComponent
                                name='times'
                                family='font-awesome'
                                size={18}
                                color={colors.ERROR}
                            />
                        </TouchableOpacity>
                    </View>
                );
            } else {
                // Opponent sent reset request - show approval banner with icon buttons
                return (
                    <View
                        style={{
                            backgroundColor: colors.INPUT,
                            paddingVertical: 14,
                            paddingHorizontal: 16,
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <Text
                            style={{
                                color: colors.TEXT,
                                fontSize: 15,
                                fontWeight: '600',
                                flex: 1,
                                marginRight: 12,
                            }}
                        >
                            {liveOpponentData?.displayName || 'Opponent'} wants to reset the game
                        </Text>
                        <View style={{ flexDirection: 'row' }}>
                            <TouchableOpacity
                                onPress={() => handleResetResponse(false)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: colors.ERROR + '15',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}
                            >
                                <IconComponent
                                    name='times'
                                    family='font-awesome'
                                    size={18}
                                    color={colors.ERROR}
                                />
                            </TouchableOpacity>
                            <TouchableOpacity
                                onPress={() => handleResetResponse(true)}
                                style={{
                                    width: 40,
                                    height: 40,
                                    borderRadius: 20,
                                    backgroundColor: colors.SUCCESS + '15',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    marginLeft: 10,
                                }}
                            >
                                <IconComponent
                                    name='check'
                                    family='font-awesome'
                                    size={18}
                                    color={colors.SUCCESS}
                                />
                            </TouchableOpacity>
                        </View>
                    </View>
                );
            }
        }

        return null;
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
            renderGameRequestBanner={renderGameRequestBanner}
            onMoveComplete={undefined} // No special move handling for PvP
            enableUndo={false}
            onUndo={undefined}
            userColor={userColor}
            effectiveBoardFlip={shouldFlipBoard}
            notificationStatus={notificationStatus}
        />
    );
};

export default PvPCoralClashBoard;
