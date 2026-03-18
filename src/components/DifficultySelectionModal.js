import {
    Dimensions,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../contexts/ThemeContext';
import Icon from './Icon';

const { width } = Dimensions.get('window');

const getDifficultyLevels = (t) => [
    {
        value: 'random',
        name: t('game.difficulty.random'),
        description: t('game.difficulty.randomDescription'),
        icon: 'shuffle',
        iconFamily: 'ionicon',
    },
    {
        value: 'easy',
        name: t('game.difficulty.easy'),
        description: t('game.difficulty.easyDescription'),
        icon: 'star-outline',
        iconFamily: 'ionicon',
    },
    {
        value: 'medium',
        name: t('game.difficulty.medium'),
        description: t('game.difficulty.mediumDescription'),
        icon: 'star-half',
        iconFamily: 'ionicon',
    },
    {
        value: 'hard',
        name: t('game.difficulty.hard'),
        description: t('game.difficulty.hardDescription'),
        icon: 'star',
        iconFamily: 'ionicon',
    },
];

/**
 * DifficultySelectionModal - Modal for selecting AI difficulty for computer games
 * @param {boolean} visible - Whether modal is visible
 * @param {function} onSelect - Callback when difficulty is selected (difficulty)
 * @param {function} onCancel - Callback when modal is cancelled
 * @param {object|null} user - Current user object (null if not logged in)
 */
export default function DifficultySelectionModal({ visible, onSelect, onCancel, user, allowAll = false }) {
    const { t } = useTranslation();
    const { colors, isDarkMode } = useTheme();

    const DIFFICULTY_LEVELS = getDifficultyLevels(t);
    const modalBackgroundColor = isDarkMode ? '#2A2A2A' : colors.CARD_BACKGROUND;

    const handleSelect = (difficulty) => {
        // Don't allow selection of premium difficulties if not logged in, unless allowAll is true
        if (!user && !allowAll && difficulty.value !== 'random') {
            return;
        }
        onSelect(difficulty.value);
    };

    const isDifficultyDisabled = (difficultyValue) => {
        // Random is always available, others require login unless allowAll is true
        return !user && !allowAll && difficultyValue !== 'random';
    };

    if (!visible) return null;

    return (
        <Modal visible={visible} transparent animationType='fade' onRequestClose={onCancel}>
            <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onCancel}>
                <View
                    style={[styles.modalContainer, { backgroundColor: modalBackgroundColor }]}
                    onStartShouldSetResponder={() => true}
                >
                    {/* Title */}
                    <Text style={[styles.title, { color: colors.TEXT }]}>
                        {t('game.difficulty.title')}
                    </Text>
                    <Text style={[styles.subtitle, { color: colors.TEXT_SECONDARY }]}>
                        {t('game.difficulty.subtitle')}
                    </Text>

                    {/* Difficulty Options */}
                    <View style={styles.optionsContainer}>
                        {DIFFICULTY_LEVELS.map((difficulty, index) => {
                            const disabled = isDifficultyDisabled(difficulty.value);
                            return (
                                <TouchableOpacity
                                    key={difficulty.value}
                                    style={[
                                        styles.optionButton,
                                        {
                                            backgroundColor: isDarkMode
                                                ? 'rgba(255, 255, 255, 0.05)'
                                                : 'rgba(0, 0, 0, 0.02)',
                                            borderColor: colors.BORDER_COLOR,
                                            opacity: disabled ? 0.5 : 1,
                                        },
                                        index !== DIFFICULTY_LEVELS.length - 1 && styles.optionMargin,
                                    ]}
                                    onPress={() => handleSelect(difficulty)}
                                    activeOpacity={disabled ? 1 : 0.7}
                                    disabled={disabled}
                                >
                                    <View style={styles.optionContent}>
                                        <Icon
                                            name={difficulty.icon}
                                            family={difficulty.iconFamily}
                                            size={32}
                                            color={disabled ? colors.TEXT_SECONDARY : colors.PRIMARY}
                                        />
                                        <View style={styles.optionText}>
                                            <View style={styles.optionNameRow}>
                                                <Text
                                                    style={[
                                                        styles.optionName,
                                                        {
                                                            color: disabled
                                                                ? colors.TEXT_SECONDARY
                                                                : colors.TEXT,
                                                        },
                                                    ]}
                                                >
                                                    {difficulty.name}
                                                </Text>
                                                {disabled && (
                                                    <View style={styles.lockBadge}>
                                                        <Icon
                                                            name='lock'
                                                            family='font-awesome'
                                                            size={12}
                                                            color={colors.TEXT_SECONDARY}
                                                        />
                                                    </View>
                                                )}
                                            </View>
                                            <Text
                                                style={[
                                                    styles.optionDescription,
                                                    {
                                                        color: disabled
                                                            ? colors.TEXT_SECONDARY
                                                            : colors.TEXT_SECONDARY,
                                                    },
                                                ]}
                                            >
                                                {disabled
                                                    ? t('game.difficulty.createAccountToAccess')
                                                    : difficulty.description}
                                            </Text>
                                        </View>
                                        {!disabled && (
                                            <Icon
                                                name='chevron-right'
                                                family='font-awesome'
                                                size={20}
                                                color={colors.TEXT_SECONDARY}
                                            />
                                        )}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Cancel Button */}
                    <TouchableOpacity
                        style={[styles.cancelButton, { borderTopColor: colors.BORDER_COLOR }]}
                        onPress={onCancel}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.cancelButtonText, { color: colors.TEXT_SECONDARY }]}>
                            {t('game.actions.cancel')}
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
        padding: 16,
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
        marginLeft: 16,
        marginRight: 18,
    },
    optionNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    optionName: {
        fontSize: 18,
        fontWeight: '600',
    },
    lockBadge: {
        marginLeft: 8,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        backgroundColor: 'rgba(0, 0, 0, 0.1)',
    },
    optionDescription: {
        fontSize: 14,
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
