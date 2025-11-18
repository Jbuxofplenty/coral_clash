import React from 'react';
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

const DIFFICULTY_LEVELS = [
    {
        value: 'random',
        name: 'Random',
        description: 'Computer makes random moves',
        icon: 'shuffle',
        iconFamily: 'ionicon',
    },
    {
        value: 'easy',
        name: 'Easy',
        description: 'Computer uses basic strategy',
        icon: 'star-outline',
        iconFamily: 'ionicon',
    },
    {
        value: 'medium',
        name: 'Medium',
        description: 'Computer uses advanced strategy',
        icon: 'star-half',
        iconFamily: 'ionicon',
    },
    {
        value: 'hard',
        name: 'Hard',
        description: 'Computer uses expert strategy',
        icon: 'star',
        iconFamily: 'ionicon',
    },
];

/**
 * DifficultySelectionModal - Modal for selecting AI difficulty for computer games
 * @param {boolean} visible - Whether modal is visible
 * @param {function} onSelect - Callback when difficulty is selected (difficulty)
 * @param {function} onCancel - Callback when modal is cancelled
 */
export default function DifficultySelectionModal({ visible, onSelect, onCancel }) {
    const { colors, isDarkMode } = useTheme();

    const modalBackgroundColor = isDarkMode ? '#2A2A2A' : colors.CARD_BACKGROUND;

    const handleSelect = (difficulty) => {
        onSelect(difficulty.value);
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
                    <Text style={[styles.title, { color: colors.TEXT }]}>Choose AI Difficulty</Text>
                    <Text style={[styles.subtitle, { color: colors.TEXT_SECONDARY }]}>
                        Select the difficulty level for the computer opponent
                    </Text>

                    {/* Difficulty Options */}
                    <View style={styles.optionsContainer}>
                        {DIFFICULTY_LEVELS.map((difficulty, index) => (
                            <TouchableOpacity
                                key={difficulty.value}
                                style={[
                                    styles.optionButton,
                                    {
                                        backgroundColor: isDarkMode
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'rgba(0, 0, 0, 0.02)',
                                        borderColor: colors.BORDER_COLOR,
                                    },
                                    index !== DIFFICULTY_LEVELS.length - 1 && styles.optionMargin,
                                ]}
                                onPress={() => handleSelect(difficulty)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionContent}>
                                    <Icon
                                        name={difficulty.icon}
                                        family={difficulty.iconFamily}
                                        size={32}
                                        color={colors.PRIMARY}
                                    />
                                    <View style={styles.optionText}>
                                        <Text style={[styles.optionName, { color: colors.TEXT }]}>
                                            {difficulty.name}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.optionDescription,
                                                { color: colors.TEXT_SECONDARY },
                                            ]}
                                        >
                                            {difficulty.description}
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
    optionName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
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
