import {
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Icon from './Icon';

const { width } = Dimensions.get('window');

const MATCHMAKING_MODES = [
    {
        type: 'instant',
        name: 'Instant',
        description: 'Find an opponent now. Matches you with online players.',
        icon: 'users',
        iconFamily: 'font-awesome',
    },
    {
        type: 'correspondence',
        name: 'Correspondence',
        description: 'Send an invitation to a random player. They have 24 hours to accept.',
        icon: 'envelope',
        iconFamily: 'font-awesome',
    },
];

/**
 * MatchmakingModeSelectionModal - Modal for selecting matchmaking mode (Instant or Correspondence)
 * @param {boolean} visible - Whether modal is visible
 * @param {function} onSelectMode - Callback when mode is selected (mode type: 'instant' or 'correspondence')
 * @param {function} onCancel - Callback when modal is cancelled
 * @param {object} timeControl - Previously selected time control
 */
export default function MatchmakingModeSelectionModal({
    visible,
    onSelectMode,
    onCancel,
    timeControl,
}) {
    const { colors, isDarkMode } = useTheme();

    const modalBackgroundColor = isDarkMode ? '#2A2A2A' : colors.CARD_BACKGROUND;

    const handleSelect = (mode) => {
        onSelectMode(mode.type);
    };

    if (!visible) return null;

    // Format time control for display
    const timeControlDisplay = timeControl
        ? timeControl.type === 'unlimited'
            ? 'No time limit'
            : timeControl.type === 'blitz'
              ? '5 minutes'
              : timeControl.type === 'normal'
                ? '10 minutes'
                : 'Time limit set'
        : '';

    return (
        <Modal visible={visible} transparent animationType='fade' onRequestClose={onCancel}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
                <View
                    style={[styles.modalContainer, { backgroundColor: modalBackgroundColor }]}
                    onStartShouldSetResponder={() => true}
                >
                    {/* Title */}
                    <Text style={[styles.title, { color: colors.TEXT }]}>Choose Game Mode</Text>
                    <Text style={[styles.subtitle, { color: colors.TEXT_SECONDARY }]}>
                        {timeControlDisplay && `Time Control: ${timeControlDisplay}`}
                    </Text>

                    {/* Mode Options */}
                    <View style={styles.optionsContainer}>
                        {MATCHMAKING_MODES.map((mode, index) => (
                            <TouchableOpacity
                                key={mode.type}
                                style={[
                                    styles.optionButton,
                                    {
                                        backgroundColor: isDarkMode
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'rgba(0, 0, 0, 0.02)',
                                        borderColor: colors.BORDER_COLOR,
                                    },
                                    index !== MATCHMAKING_MODES.length - 1 && styles.optionMargin,
                                ]}
                                onPress={() => handleSelect(mode)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionContent}>
                                    <Icon
                                        name={mode.icon}
                                        family={mode.iconFamily}
                                        size={32}
                                        color={colors.PRIMARY}
                                    />
                                    <View style={styles.optionText}>
                                        <Text style={[styles.optionName, { color: colors.TEXT }]}>
                                            {mode.name}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.optionDescription,
                                                { color: colors.TEXT_SECONDARY },
                                            ]}
                                        >
                                            {mode.description}
                                        </Text>
                                    </View>
                                    <Icon
                                        name='chevron-right'
                                        family='font-awesome'
                                        size={20}
                                        color={colors.TEXT_SECONDARY}
                                    />
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {/* Cancel Button */}
                    <TouchableOpacity
                        style={[styles.cancelButton, { borderTopColor: colors.BORDER_COLOR }]}
                        onPress={onCancel}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.cancelButtonText, { color: colors.TEXT_SECONDARY }]}>
                            Cancel
                        </Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: Math.min(width - 48, 360),
        borderRadius: 14,
        overflow: 'hidden',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.25,
                shadowRadius: 3.84,
            },
            android: {
                elevation: 5,
            },
        }),
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        textAlign: 'center',
        paddingTop: 24,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
        marginBottom: 20,
    },
    optionsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    optionButton: {
        borderRadius: 12,
        borderWidth: 1,
        paddingHorizontal: 12,
        paddingVertical: 14,
    },
    optionMargin: {
        marginBottom: 12,
    },
    optionContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    optionText: {
        flex: 1,
        flexShrink: 1,
        marginLeft: 12,
        marginRight: 8,
    },
    optionName: {
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 2,
    },
    optionDescription: {
        fontSize: 13,
    },
    cancelButton: {
        paddingVertical: 16,
        alignItems: 'center',
        justifyContent: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    cancelButtonText: {
        fontSize: 17,
        fontWeight: '600',
    },
});
