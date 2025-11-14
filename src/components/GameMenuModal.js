import { createGameSnapshot } from '@jbuxofplenty/coral-clash';
import { useNavigation } from '@react-navigation/native';
import { Icon } from 'galio-framework';
import { Animated, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

const GameMenuModal = ({
    visible,
    slideAnim: _slideAnim, // Reserved for future use
    translateY,
    onClose,
    DEV_FEATURES_ENABLED,
    onExportState,
    opponentType,
    onFlipBoard,
    isBoardFlipped,
    coralClash,
    renderMenuItems,
    onResign,
    isGameActionProcessing,
    colors,
    baseStyles,
    gameData,
}) => {
    const navigation = useNavigation();

    return (
        <Modal
            visible={visible}
            transparent
            animationType='fade'
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <Animated.View
                    style={[
                        styles.drawerContainer,
                        {
                            backgroundColor: colors.CARD_BACKGROUND,
                            transform: [{ translateY }],
                        },
                    ]}
                    onStartShouldSetResponder={() => true}
                >
                    <View style={styles.drawerHandle} />

                    <View style={styles.menuItems}>
                        {/* Save Game State - Only show when dev features are enabled */}
                        {DEV_FEATURES_ENABLED && (
                            <TouchableOpacity
                                style={[
                                    styles.menuItem,
                                    { borderBottomColor: colors.BORDER_COLOR },
                                ]}
                                onPress={onExportState}
                                activeOpacity={0.7}
                            >
                                <Icon
                                    name='save'
                                    family='MaterialIcons'
                                    size={28}
                                    color={colors.PRIMARY}
                                />
                                <View style={styles.menuItemText}>
                                    <Text
                                        style={[
                                            styles.menuItemTitle,
                                            { color: colors.TEXT },
                                        ]}
                                    >
                                        Save Game State
                                    </Text>
                                    <Text
                                        style={[
                                            styles.menuItemSubtitle,
                                            { color: colors.TEXT_SECONDARY },
                                        ]}
                                    >
                                        Export current game position
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Flip Board - Hidden for Pass and Play (board auto-flips after each move) */}
                        {opponentType !== 'passandplay' && (
                            <TouchableOpacity
                                style={[
                                    styles.menuItem,
                                    { borderBottomColor: colors.BORDER_COLOR },
                                ]}
                                onPress={onFlipBoard}
                                activeOpacity={0.7}
                            >
                                <Icon
                                    name='swap-vert'
                                    family='MaterialIcons'
                                    size={28}
                                    color='#4caf50'
                                />
                                <View style={styles.menuItemText}>
                                    <Text
                                        style={[
                                            styles.menuItemTitle,
                                            { color: colors.TEXT },
                                        ]}
                                    >
                                        Flip Board
                                    </Text>
                                    <Text
                                        style={[
                                            styles.menuItemSubtitle,
                                            { color: colors.TEXT_SECONDARY },
                                        ]}
                                    >
                                        {isBoardFlipped
                                            ? 'Currently showing black on bottom'
                                            : 'Currently showing white on bottom'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Report Bug */}
                        <TouchableOpacity
                            style={[
                                styles.menuItem,
                                { borderBottomColor: colors.BORDER_COLOR },
                            ]}
                            onPress={() => {
                                onClose();
                                // Create game snapshot to include with bug report
                                const snapshot = createGameSnapshot(coralClash);
                                navigation.navigate('Report Issue', {
                                    gameSnapshot: snapshot,
                                });
                            }}
                            activeOpacity={0.7}
                        >
                            <Icon
                                name='bug-report'
                                family='MaterialIcons'
                                size={28}
                                color='#ff9800'
                            />
                            <View style={styles.menuItemText}>
                                <Text
                                    style={[styles.menuItemTitle, { color: colors.TEXT }]}
                                >
                                    Report Bug
                                </Text>
                                <Text
                                    style={[
                                        styles.menuItemSubtitle,
                                        { color: colors.TEXT_SECONDARY },
                                    ]}
                                >
                                    Include current game state
                                </Text>
                            </View>
                        </TouchableOpacity>

                        {/* Custom menu items from subclasses */}
                        {renderMenuItems &&
                            renderMenuItems({
                                closeMenu: onClose,
                                coralClash,
                                colors,
                                styles: styles, // Pass modal menu styles for menu items
                                baseStyles: baseStyles, // Also pass baseStyles for control bar if needed
                                gameData,
                            })}

                        {/* Resign */}
                        <TouchableOpacity
                            style={[
                                styles.menuItem,
                                {
                                    opacity:
                                        coralClash.isGameOver() || isGameActionProcessing
                                            ? 0.5
                                            : 1,
                                },
                            ]}
                            onPress={onResign}
                            disabled={coralClash.isGameOver() || isGameActionProcessing}
                            activeOpacity={0.7}
                        >
                            <Icon
                                name='flag'
                                family='MaterialIcons'
                                size={28}
                                color={
                                    coralClash.isGameOver() || isGameActionProcessing
                                        ? colors.MUTED
                                        : '#d32f2f'
                                }
                            />
                            <View style={styles.menuItemText}>
                                <Text
                                    style={[
                                        styles.menuItemTitle,
                                        {
                                            color:
                                                coralClash.isGameOver() ||
                                                isGameActionProcessing
                                                    ? colors.MUTED
                                                    : colors.TEXT,
                                        },
                                    ]}
                                >
                                    {isGameActionProcessing
                                        ? 'Resigning...'
                                        : 'Resign Game'}
                                </Text>
                                <Text
                                    style={[
                                        styles.menuItemSubtitle,
                                        { color: colors.TEXT_SECONDARY },
                                    ]}
                                >
                                    {isGameActionProcessing
                                        ? 'Please wait...'
                                        : coralClash.isGameOver()
                                          ? 'Game already ended'
                                          : 'Forfeit the current game'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Cancel Button */}
                    <TouchableOpacity
                        style={[
                            styles.cancelButton,
                            { borderTopColor: colors.BORDER_COLOR },
                        ]}
                        onPress={onClose}
                        activeOpacity={0.7}
                    >
                        <Text
                            style={[
                                styles.cancelButtonText,
                                { color: colors.TEXT_SECONDARY },
                            ]}
                        >
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    drawerContainer: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        paddingBottom: 34,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 10,
    },
    drawerHandle: {
        width: 40,
        height: 4,
        backgroundColor: '#CCCCCC',
        borderRadius: 2,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 20,
    },
    menuItems: {
        paddingHorizontal: 20,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    menuItemText: {
        flex: 1,
        marginLeft: 16,
    },
    menuItemTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    menuItemSubtitle: {
        fontSize: 14,
    },
    cancelButton: {
        paddingVertical: 16,
        alignItems: 'center',
        borderTopWidth: 1,
        marginTop: 8,
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default GameMenuModal;

