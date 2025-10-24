import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import Icon from './Icon';

const { width } = Dimensions.get('window');

const TIME_CONTROLS = [
    {
        type: 'blitz',
        name: 'Blitz',
        description: '5 minutes per player',
        totalSeconds: 300, // 5 * 60
        icon: 'bolt',
        iconFamily: 'font-awesome',
    },
    {
        type: 'normal',
        name: 'Normal',
        description: '10 minutes per player',
        totalSeconds: 600, // 10 * 60
        icon: 'clock-o',
        iconFamily: 'font-awesome',
    },
    {
        type: 'unlimited',
        name: 'Unlimited',
        description: 'No time limit',
        totalSeconds: null,
        icon: 'infinite',
        iconFamily: 'ionicon',
    },
];

/**
 * TimeControlModal - Modal for selecting time control before starting a game
 * @param {boolean} visible - Whether modal is visible
 * @param {function} onSelect - Callback when time control is selected (type, totalSeconds)
 * @param {function} onCancel - Callback when modal is cancelled
 */
export default function TimeControlModal({ visible, onSelect, onCancel }) {
    const { colors, isDarkMode } = useTheme();

    const modalBackgroundColor = isDarkMode ? '#2A2A2A' : colors.CARD_BACKGROUND;

    const handleSelect = (timeControl) => {
        onSelect({
            type: timeControl.type,
            totalSeconds: timeControl.totalSeconds,
        });
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
                    <Text style={[styles.title, { color: colors.TEXT }]}>Choose Time Control</Text>
                    <Text style={[styles.subtitle, { color: colors.TEXT_SECONDARY }]}>
                        Select the time limit for this game
                    </Text>

                    {/* Time Control Options */}
                    <View style={styles.optionsContainer}>
                        {TIME_CONTROLS.map((timeControl, index) => (
                            <TouchableOpacity
                                key={timeControl.type}
                                style={[
                                    styles.optionButton,
                                    {
                                        backgroundColor: isDarkMode
                                            ? 'rgba(255, 255, 255, 0.05)'
                                            : 'rgba(0, 0, 0, 0.02)',
                                        borderColor: colors.BORDER_COLOR,
                                    },
                                    index !== TIME_CONTROLS.length - 1 && styles.optionMargin,
                                ]}
                                onPress={() => handleSelect(timeControl)}
                                activeOpacity={0.7}
                            >
                                <View style={styles.optionContent}>
                                    <Icon
                                        name={timeControl.icon}
                                        family={timeControl.iconFamily}
                                        size={32}
                                        color={colors.PRIMARY}
                                    />
                                    <View style={styles.optionText}>
                                        <Text style={[styles.optionName, { color: colors.TEXT }]}>
                                            {timeControl.name}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.optionDescription,
                                                { color: colors.TEXT_SECONDARY },
                                            ]}
                                        >
                                            {timeControl.description}
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
        marginLeft: 16,
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
