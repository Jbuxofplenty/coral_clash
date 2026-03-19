import { calculateUndoMoveCount } from '@jbuxofplenty/coral-clash';
import { Icon } from 'galio-framework';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, TouchableOpacity, View } from 'react-native';
import { db, doc, onSnapshot } from '../config/firebase';
import { useAlert, useAuth, useGamePreferences } from '../contexts';
import { useFirebaseFunctions } from '../hooks';
import BaseCoralClashBoard, { baseStyles } from './BaseCoralClashBoard';
import GameRequestBanner from './GameRequestBanner';

/**
 * Format display name with discriminator
 * @param {string} displayName - The display name
 * @param {string} discriminator - The 4-digit discriminator
 * @returns {string} Formatted name like "Username #1234"
 */
const formatDisplayName = (displayName, discriminator, t) => {
    if (!displayName) {
        return t('components.pvpBoard.player');
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
    const { t } = useTranslation();
    const { user } = useAuth();
    const { isBoardFlipped } = useGamePreferences();
    const { showAlert } = useAlert();
    const {
        requestGameReset,
        requestUndo,
        respondToUndoRequest,
        respondToResetRequest,
        remindOpponent,
    } = useFirebaseFunctions();
    const [userColor, setUserColor] = useState(null);
    const [_creatorId, setCreatorId] = useState(null);
    const [_opponentId, setOpponentId] = useState(null);
    const [undoRequestData, setUndoRequestData] = useState(null);
    const [resetRequestData, setResetRequestData] = useState(null);
    const [currentMoveCount, setCurrentMoveCount] = useState(0); // Track move count from Firestore
    const [liveOpponentData, setLiveOpponentData] = useState(opponentData); // Track live opponent data
    const [lastReminderSent, setLastReminderSent] = useState(null); // Track when user last sent a reminder

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

                    // Track last reminder sent timestamp for this user
                    if (gameData.lastReminderSent && gameData.lastReminderSent[user.uid]) {
                        setLastReminderSent(gameData.lastReminderSent[user.uid]);
                    } else {
                        setLastReminderSent(null);
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
    const handleUndoRequest = async (clearVisibleMoves) => {
        showAlert(
            t('components.pvpBoard.requestUndoTitle'),
            t('components.pvpBoard.requestUndoMessage', {
                opponentName: liveOpponentData?.displayName || t('components.pvpBoard.opponent'),
            }),
            [
                {
                    text: t('components.pvpBoard.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('components.pvpBoard.request'),
                    onPress: async () => {
                        try {
                            // Clear visible moves immediately when undo is requested
                            // since board state will be updated and shown moves could be invalidated
                            if (clearVisibleMoves) {
                                clearVisibleMoves();
                            }
                            // Undo just the last move (the player's own move)
                            await requestUndo({ gameId, moveCount: 1 });
                        } catch (error) {
                            console.error('Error requesting undo:', error);
                            showAlert(
                                t('components.pvpBoard.errorReminderTitle'),
                                t('components.pvpBoard.errorUndoRequest'),
                            );
                        }
                    },
                },
            ],
        );
    };

    // Handler for responding to undo request
    const handleUndoResponse = async (approve, clearVisibleMoves) => {
        try {
            // Clear visible moves immediately when responding to undo
            // since board state may be updated and shown moves could be invalidated
            if (clearVisibleMoves) {
                clearVisibleMoves();
            }
            await respondToUndoRequest({ gameId, approve });
            // No need to show alert - the banner will disappear automatically via Firestore listener
        } catch (error) {
            console.error('Error responding to undo request:', error);
            showAlert(
                t('components.pvpBoard.errorReminderTitle'),
                t('components.pvpBoard.errorUndoResponse'),
            );
        }
    };

    // Handler for responding to reset request
    const handleResetResponse = async (approve) => {
        try {
            await respondToResetRequest({ gameId, approve });
            // No need to show alert - the banner will disappear automatically via Firestore listener
        } catch (error) {
            console.error('Error responding to reset request:', error);
            showAlert(
                t('components.pvpBoard.errorReminderTitle'),
                t('components.pvpBoard.errorResetResponse'),
            );
        }
    };

    // Handler for canceling undo request
    const handleCancelUndoRequest = async () => {
        try {
            // Cancel by declining your own request
            await respondToUndoRequest({ gameId, approve: false });
        } catch (error) {
            console.error('Error canceling undo request:', error);
            showAlert(
                t('components.pvpBoard.errorReminderTitle'),
                t('components.pvpBoard.errorCancelUndo'),
            );
        }
    };

    // Handler for canceling reset request
    const handleCancelResetRequest = async () => {
        try {
            // Cancel by declining your own request
            await respondToResetRequest({ gameId, approve: false });
        } catch (error) {
            console.error('Error canceling reset request:', error);
            showAlert(
                t('components.pvpBoard.errorReminderTitle'),
                t('components.pvpBoard.errorCancelReset'),
            );
        }
    };

    // Handler for reminding opponent
    const handleRemindOpponent = async () => {
        try {
            await remindOpponent({ gameId });
            showAlert(
                t('components.pvpBoard.reminderSentTitle'),
                t('components.pvpBoard.reminderSentMessage'),
            );
        } catch (error) {
            console.error('Error sending reminder:', error);
            // Extract error message from Firebase error
            const errorMessage = error.message || t('components.pvpBoard.errorReminderMessage');
            showAlert(t('components.pvpBoard.errorReminderTitle'), errorMessage);
        }
    };

    // PvP-specific: Render control buttons (menu, undo, and history navigation)
    const renderControls = ({
        openMenu,
        clearVisibleMoves,
        colors,
        canGoBack,
        canGoForward,
        handleHistoryBack,
        handleHistoryForward,
        coralClash,
        isViewingHistory,
        gameData,
    }) => {
        const historyLength = coralClash.historyLength();
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
                    onPress={() => handleUndoRequest(clearVisibleMoves)}
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
        const noMovesYet = coralClash.historyLength() === 0;

        const handleResetRequest = async () => {
            closeMenu();

            // Wait for menu animation to complete before showing alert
            await new Promise((resolve) => setTimeout(resolve, 300));

            showAlert(
                t('components.pvpBoard.requestResetTitle'),
                t('components.pvpBoard.requestResetMessage', {
                    opponentName:
                        liveOpponentData?.displayName || t('components.pvpBoard.opponent'),
                }),
                [
                    {
                        text: t('components.pvpBoard.cancel'),
                        style: 'cancel',
                    },
                    {
                        text: t('components.pvpBoard.request'),
                        style: 'destructive',
                        onPress: async () => {
                            try {
                                await requestGameReset({ gameId });
                            } catch (error) {
                                console.error('Error requesting reset:', error);
                                showAlert(
                                    t('components.pvpBoard.errorReminderTitle'),
                                    t('components.pvpBoard.errorResetResponse'),
                                );
                            }
                        },
                    },
                ],
            );
        };

        // Disable reset if game is over, no moves yet, or if there's a pending undo request
        const isResetDisabled = isGameOver || noMovesYet || undoRequestData;
        let resetSubtitle = t('components.pvpBoard.askOpponentReset');
        if (isGameOver) {
            resetSubtitle = t('components.pvpBoard.gameEnded');
        } else if (noMovesYet) {
            resetSubtitle = t('components.pvpBoard.noMoves');
        } else if (undoRequestData) {
            resetSubtitle = t('components.pvpBoard.pendingUndo');
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
                            {t('components.pvpBoard.requestReset')}
                        </Text>
                        <Text style={[styles.menuItemSubtitle, { color: colors.TEXT_SECONDARY }]}>
                            {resetSubtitle}
                        </Text>
                    </View>
                </TouchableOpacity>

                {/* Remind Opponent */}
                {(() => {
                    // Calculate if reminder can be sent
                    const canSendReminder = !isGameOver && gameData?.currentTurn !== user?.uid;
                    let isReminderDisabled = !canSendReminder;
                    let reminderSubtitle = t('components.pvpBoard.remindOpponentSubtitle');

                    // Check 24-hour cooldown
                    if (canSendReminder && lastReminderSent) {
                        const now = Date.now();
                        const lastReminderTime = lastReminderSent.toDate
                            ? lastReminderSent.toDate().getTime()
                            : lastReminderSent;
                        const timeSinceLastReminder = now - lastReminderTime;
                        const twentyFourHours = 24 * 60 * 60 * 1000;

                        if (timeSinceLastReminder < twentyFourHours) {
                            isReminderDisabled = true;
                            const hoursRemaining = Math.ceil(
                                (twentyFourHours - timeSinceLastReminder) / (60 * 60 * 1000),
                            );
                            reminderSubtitle = t('components.pvpBoard.availableInHours', {
                                hours: hoursRemaining,
                            });
                        }
                    }

                    if (isGameOver) {
                        reminderSubtitle = t('components.pvpBoard.gameEnded');
                    } else if (gameData?.currentTurn === user?.uid) {
                        reminderSubtitle = t('components.pvpBoard.yourTurn');
                    }

                    return (
                        <TouchableOpacity
                            style={[
                                styles.menuItem,
                                {
                                    borderBottomColor: colors.BORDER_COLOR,
                                    opacity: isReminderDisabled ? 0.5 : 1,
                                },
                            ]}
                            onPress={() => {
                                closeMenu();
                                // Wait for menu animation to complete
                                setTimeout(() => handleRemindOpponent(), 300);
                            }}
                            disabled={isReminderDisabled}
                            activeOpacity={0.7}
                        >
                            <Icon
                                name='notifications'
                                family='MaterialIcons'
                                size={28}
                                color={isReminderDisabled ? colors.MUTED : '#2196f3'}
                            />
                            <View style={styles.menuItemText}>
                                <Text
                                    style={[
                                        styles.menuItemTitle,
                                        {
                                            color: isReminderDisabled ? colors.MUTED : colors.TEXT,
                                        },
                                    ]}
                                >
                                    {t('components.pvpBoard.remindOpponent')}
                                </Text>
                                <Text
                                    style={[
                                        styles.menuItemSubtitle,
                                        { color: colors.TEXT_SECONDARY },
                                    ]}
                                >
                                    {reminderSubtitle}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })()}
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
    let opponentName = liveOpponentData?.displayName || t('components.pvpBoard.opponent');
    let opponentAvatar = liveOpponentData?.avatarKey || 'dolphin';

    // Format current user's name with discriminator
    // Use fallback if discriminator hasn't loaded yet
    const userName = formatDisplayName(user?.displayName, user?.discriminator, t);

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
    const renderGameRequestBanner = ({ coralClash: _coralClash, clearVisibleMoves }) => {
        // Priority: Show undo request first, then reset request
        if (undoRequestData) {
            // Calculate dynamic move count based on current game state using shared logic
            // Use currentMoveCount from Firestore listener instead of coralClash.historyLength()
            // to ensure we have the latest value from the server
            const dynamicMoveCount = calculateUndoMoveCount(
                undoRequestData.moveCount,
                undoRequestData.undoRequestAtMoveNumber,
                currentMoveCount,
            );

            if (undoRequestData.isUserTheRequester) {
                // User sent the undo request - show waiting banner with cancel option
                return (
                    <GameRequestBanner
                        mode='waiting'
                        message={t('components.pvpBoard.waitingUndoResponse', {
                            opponentName:
                                liveOpponentData?.displayName || t('components.pvpBoard.opponent'),
                            moveCount: dynamicMoveCount,
                        })}
                        onCancel={handleCancelUndoRequest}
                    />
                );
            } else {
                // Opponent sent undo request - show approval banner with icon buttons
                return (
                    <GameRequestBanner
                        mode='approval'
                        message={t('components.pvpBoard.opponentWantsUndo', {
                            opponentName:
                                liveOpponentData?.displayName || t('components.pvpBoard.opponent'),
                            moveCount: dynamicMoveCount,
                        })}
                        onDecline={() => handleUndoResponse(false, clearVisibleMoves)}
                        onAccept={() => handleUndoResponse(true, clearVisibleMoves)}
                    />
                );
            }
        }

        if (resetRequestData) {
            if (resetRequestData.isUserTheRequester) {
                // User sent the reset request - show waiting banner with cancel option
                return (
                    <GameRequestBanner
                        mode='waiting'
                        message={t('components.pvpBoard.waitingResetResponse', {
                            opponentName:
                                liveOpponentData?.displayName || t('components.pvpBoard.opponent'),
                        })}
                        onCancel={handleCancelResetRequest}
                    />
                );
            } else {
                // Opponent sent reset request - show approval banner with icon buttons
                return (
                    <GameRequestBanner
                        mode='approval'
                        message={t('components.pvpBoard.opponentWantsReset', {
                            opponentName:
                                liveOpponentData?.displayName || t('components.pvpBoard.opponent'),
                        })}
                        onDecline={() => handleResetResponse(false)}
                        onAccept={() => handleResetResponse(true)}
                    />
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
