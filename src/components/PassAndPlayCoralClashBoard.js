import { Icon } from 'galio-framework';
import React, { useState } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { useAlert, useAuth } from '../contexts';
import { deletePassAndPlayGame, updatePassAndPlayGame } from '../utils/passAndPlayStorage';
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
 * PassAndPlayCoralClashBoard - Board for local pass-and-play games
 * Extends BaseCoralClashBoard with:
 * - Single-move undo functionality
 * - Automatic board flipping after each move
 * - No approval needed for actions (undo, reset, resign)
 * - Local multiplayer between two players on the same device
 */
const PassAndPlayCoralClashBoard = ({
    fixture,
    gameId,
    gameState,
    timeControl,
    notificationStatus,
}) => {
    const { user } = useAuth();
    const { showAlert } = useAlert();

    // Manage board flipping locally for pass-and-play (don't persist to storage)
    // Initialize based on whose turn it is in saved game state or fixture
    const [isBoardFlipped, setIsBoardFlipped] = useState(() => {
        // If loading a saved game, check whose turn it is
        if (gameState && gameState.turn) {
            return gameState.turn === 'b'; // Flip if it's black's turn
        }
        // If loading a fixture, check whose turn it is
        if (fixture && fixture.state && fixture.state.turn) {
            return fixture.state.turn === 'b'; // Flip if it's black's turn
        }
        return false; // New game starts with white (not flipped)
    });

    // Handle move completion - save state and flip board after each move
    const handleMoveComplete = async (result, _move) => {
        // Save or delete game state from local storage
        if (gameId && gameId.startsWith('local_')) {
            if (result.gameOver) {
                // Delete game from storage when it's over
                await deletePassAndPlayGame(gameId);
            } else {
                // Update game state
                await updatePassAndPlayGame(gameId, {
                    gameState: result.gameState,
                });
            }
        }

        // Flip board for next player's turn
        if (!result.gameOver) {
            setIsBoardFlipped((prev) => !prev);
        }
    };

    // Render control buttons
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
        gameData: _gameData,
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

    // Render menu items
    const renderMenuItems = ({ closeMenu, coralClash, colors, styles, gameData }) => {
        const isGameOver = coralClash.isGameOver() || gameData?.status === 'completed';
        const noMovesYet = coralClash.historyLength() === 0;

        const handleReset = async () => {
            closeMenu();

            // Wait for menu animation to complete before showing alert
            setTimeout(() => {
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
            }, 300);
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

    // Undo single move and flip board back
    const handleUndo = async (coralClash) => {
        if (!coralClash) return;

        coralClash.undo();
        setIsBoardFlipped((prev) => !prev);
    };

    // Handle resign - delete game from storage
    const handleResign = async () => {
        if (gameId && gameId.startsWith('local_')) {
            await deletePassAndPlayGame(gameId);
        }
    };

    // In pass-and-play:
    // - Logged-in user = White (always)
    // - Guest 1 = Black (always)
    // - Board flip changes visual perspective, not player colors
    const userName = formatDisplayName(user?.displayName, user?.discriminator);
    const whitePlayerData = {
        name: userName,
        avatarKey: user?.avatarKey,
        isComputer: false,
    };
    const blackPlayerData = {
        name: 'Guest 1',
        avatarKey: 'crab',
        isComputer: false,
    };

    // When board is flipped (black's perspective), black is at bottom
    // When board is not flipped (white's perspective), white is at bottom
    const topPlayer = isBoardFlipped ? whitePlayerData : blackPlayerData;
    const bottomPlayer = isBoardFlipped ? blackPlayerData : whitePlayerData;

    return (
        <BaseCoralClashBoard
            fixture={fixture}
            gameId={gameId}
            gameState={gameState}
            opponentType='passandplay'
            topPlayerData={topPlayer}
            bottomPlayerData={bottomPlayer}
            renderControls={renderControls}
            renderMenuItems={renderMenuItems}
            onMoveComplete={handleMoveComplete}
            enableUndo={true}
            onUndo={handleUndo}
            onResign={handleResign}
            userColor={null} // null = both players can move (pass-and-play)
            effectiveBoardFlip={isBoardFlipped} // Controls visual perspective and piece colors
            timeControl={timeControl}
            notificationStatus={notificationStatus}
        />
    );
};

export default PassAndPlayCoralClashBoard;
