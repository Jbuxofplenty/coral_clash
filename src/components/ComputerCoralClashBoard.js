import { Icon } from 'galio-framework';
import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAlert, useAuth, useGamePreferences } from '../contexts';
import { useFirebaseFunctions } from '../hooks';
import BaseCoralClashBoard, { baseStyles } from './BaseCoralClashBoard';

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
 * ComputerCoralClashBoard - Board for games against the computer
 * Extends BaseCoralClashBoard with:
 * - Undo functionality (undo both player and computer moves)
 * - Reset functionality
 * - Automatic computer move after player moves
 * - Offline local computer AI
 */
const ComputerCoralClashBoard = ({ fixture, gameId, gameState, notificationStatus }) => {
    const { user } = useAuth();
    const { isBoardFlipped } = useGamePreferences();
    const { showAlert } = useAlert();
    const {
        makeComputerMove: makeComputerMoveAPI,
        requestGameReset,
        requestUndo,
    } = useFirebaseFunctions();

    // Computer-specific: Handle move completion
    const handleMoveComplete = async (result, _move) => {
        // If it's a computer game and computer's turn, trigger computer move
        if (
            result.opponentType === 'computer' &&
            result.gameState?.turn === 'b' &&
            !result.gameOver
        ) {
            // Trigger computer move (Firestore listener will apply it automatically)
            try {
                await makeComputerMoveAPI({ gameId });
            } catch (error) {
                console.error('Error making computer move:', error);
            }
        }
    };

    // Computer-specific: Render control buttons
    const renderControls = ({
        openMenu,
        canUndo,
        handleUndo,
        colors,
        canGoBack,
        canGoForward,
        handleHistoryBack,
        handleHistoryForward,
        isViewingHistory,
        gameData: _gameData, // Added for consistency with PvP board
    }) => (
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
                onPress={handleUndo}
                disabled={!canUndo || isViewingHistory}
                activeOpacity={0.7}
            >
                <Icon
                    name='undo'
                    family='MaterialIcons'
                    size={44}
                    color={canUndo && !isViewingHistory ? colors.WHITE : colors.MUTED}
                />
            </TouchableOpacity>

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
                style={baseStyles.controlButton}
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
    );

    // Computer-specific: Render menu items
    const renderMenuItems = ({ closeMenu, coralClash, colors, styles, gameData }) => {
        // Check both local game engine state AND server-side completion status (e.g., timeout)
        const isGameOver = coralClash.isGameOver() || gameData?.status === 'completed';
        const moveHistory = coralClash.history();
        const noMovesYet = moveHistory.length === 0;

        const handleReset = async () => {
            closeMenu();

            // Wait for menu animation to complete before showing alert
            setTimeout(() => {
                if (gameId) {
                    // Online game - request reset from server
                    showAlert(
                        'Reset Game',
                        'Request to reset this game? The computer will automatically approve.',
                        [
                            {
                                text: 'Cancel',
                                style: 'cancel',
                            },
                            {
                                text: 'Reset',
                                style: 'destructive',
                                onPress: async () => {
                                    try {
                                        await requestGameReset({ gameId });
                                    } catch (error) {
                                        console.error('Error requesting reset:', error);
                                        showAlert(
                                            'Error',
                                            'Failed to reset game. Please try again.',
                                        );
                                    }
                                },
                            },
                        ],
                    );
                } else {
                    // Offline game - local reset
                    showAlert('Reset Game', 'Are you sure you want to start a new game?', [
                        {
                            text: 'Cancel',
                            style: 'cancel',
                        },
                        {
                            text: 'Reset',
                            style: 'destructive',
                            onPress: () => {
                                coralClash.reset();
                            },
                        },
                    ]);
                }
            }, 300); // 300ms delay for menu close animation
        };

        const isResetDisabled = isGameOver || noMovesYet;
        let resetSubtitle = 'Start a new game from the beginning';
        if (isGameOver) {
            resetSubtitle = 'Game already ended';
        } else if (noMovesYet) {
            resetSubtitle = 'No moves have been made yet';
        }

        return (
            <TouchableOpacity
                style={[
                    styles.menuItem,
                    { borderBottomColor: colors.BORDER_COLOR, opacity: isResetDisabled ? 0.5 : 1 },
                ]}
                onPress={handleReset}
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
                    <Text style={[styles.menuItemTitle, { color: colors.TEXT }]}>Reset Game</Text>
                    <Text style={[styles.menuItemSubtitle, { color: colors.TEXT_SECONDARY }]}>
                        {resetSubtitle}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // Computer-specific: Undo both moves (computer + player)
    const handleUndo = async (coralClash) => {
        if (!coralClash) return;

        // Online game - use API
        if (gameId) {
            try {
                await requestUndo({ gameId, moveCount: 2 });
                // Firestore listener will apply the undo automatically
            } catch (error) {
                console.error('Error requesting undo:', error);
                showAlert('Error', 'Failed to undo. Please try again.');
            }
        } else {
            // Offline game - local undo
            // Undo computer's move (black)
            coralClash.undo();
            // Undo user's move (white)
            coralClash.undo();
        }
    };

    // Determine which player is on top/bottom based on board flip
    // Format user's name with discriminator
    const userName = formatDisplayName(user?.displayName, user?.discriminator);

    const topPlayer = isBoardFlipped
        ? { name: userName, avatarKey: user?.avatarKey, isComputer: false }
        : { name: 'Computer', isComputer: true };

    const bottomPlayer = isBoardFlipped
        ? { name: 'Computer', isComputer: true }
        : { name: userName, avatarKey: user?.avatarKey, isComputer: false };

    return (
        <BaseCoralClashBoard
            fixture={fixture}
            gameId={gameId}
            gameState={gameState}
            opponentType='computer'
            topPlayerData={topPlayer}
            bottomPlayerData={bottomPlayer}
            renderControls={renderControls}
            renderMenuItems={renderMenuItems}
            onMoveComplete={gameId ? handleMoveComplete : undefined}
            enableUndo={true}
            onUndo={handleUndo}
            userColor='w' // User always plays as white in computer games
            notificationStatus={notificationStatus}
        />
    );
};

export default ComputerCoralClashBoard;
