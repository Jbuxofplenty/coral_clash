import React, { useState, useEffect } from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
    Platform,
    ActivityIndicator,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';

const { width } = Dimensions.get('window');

/**
 * ThemedAlert - A custom Alert component that respects theme settings
 * Drop-in replacement for React Native's Alert.alert()
 *
 * Usage via AlertContext:
 * const { showAlert } = useAlert();
 * showAlert('Title', 'Message', [{ text: 'OK', onPress: () => {} }]);
 */
export default function ThemedAlert({ visible, title, message, buttons = [], onDismiss }) {
    const { colors, isDarkMode } = useTheme();
    const [isProcessing, setIsProcessing] = useState(false);

    // Use a lighter background in dark mode for better contrast
    const alertBackgroundColor = isDarkMode ? '#2A2A2A' : colors.CARD_BACKGROUND;

    // Reset processing state when alert is dismissed
    useEffect(() => {
        if (!visible) {
            setIsProcessing(false);
        }
    }, [visible]);

    const handleButtonPress = async (button) => {
        // Prevent multiple clicks while processing
        if (isProcessing) {
            return;
        }

        setIsProcessing(true);

        // Dismiss the modal immediately for better UX
        onDismiss();

        // If button has onPress handler, call it (don't wait for completion)
        if (button.onPress) {
            try {
                // Execute in background after modal is dismissed
                button.onPress().catch((error) => {
                    console.error('Error in alert button handler:', error);
                });
            } catch (error) {
                console.error('Error in alert button handler:', error);
            }
        }
    };

    const handleBackdropPress = () => {
        // Find cancel button or dismiss
        const cancelButton = buttons.find((b) => b.style === 'cancel');
        if (cancelButton) {
            handleButtonPress(cancelButton);
        } else {
            onDismiss();
        }
    };

    if (!visible) {
        return null;
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType='fade'
            onRequestClose={handleBackdropPress}
        >
            <TouchableOpacity
                style={styles.overlay}
                activeOpacity={1}
                onPress={handleBackdropPress}
            >
                <View
                    style={[styles.alertContainer, { backgroundColor: alertBackgroundColor }]}
                    onStartShouldSetResponder={() => true}
                >
                    {/* Title */}
                    {title && <Text style={[styles.title, { color: colors.TEXT }]}>{title}</Text>}

                    {/* Message */}
                    {message && (
                        <Text style={[styles.message, { color: colors.TEXT_SECONDARY }]}>
                            {message}
                        </Text>
                    )}

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        {buttons.map((button, index) => {
                            const isDestructive = button.style === 'destructive';
                            const isCancel = button.style === 'cancel';
                            const isLast = index === buttons.length - 1;

                            return (
                                <TouchableOpacity
                                    key={index}
                                    style={[
                                        styles.button,
                                        !isLast && styles.buttonBorder,
                                        {
                                            borderColor: colors.BORDER,
                                            opacity: isProcessing ? 0.6 : 1,
                                        },
                                    ]}
                                    onPress={() => handleButtonPress(button)}
                                    disabled={isProcessing}
                                    activeOpacity={0.7}
                                >
                                    {isProcessing && !isCancel ? (
                                        <ActivityIndicator
                                            size='small'
                                            color={isDestructive ? colors.ERROR : colors.PRIMARY}
                                        />
                                    ) : (
                                        <Text
                                            style={[
                                                styles.buttonText,
                                                {
                                                    color: isDestructive
                                                        ? colors.ERROR
                                                        : isCancel
                                                          ? colors.TEXT_SECONDARY
                                                          : colors.PRIMARY,
                                                },
                                                (isCancel || isDestructive) &&
                                                    styles.buttonTextBold,
                                            ]}
                                        >
                                            {button.text || 'OK'}
                                        </Text>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>
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
    alertContainer: {
        width: Math.min(width - 48, 320),
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
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        paddingTop: 20,
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    message: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 20,
        paddingBottom: 20,
        lineHeight: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: 'rgba(60, 60, 67, 0.36)',
    },
    button: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    buttonBorder: {
        borderRightWidth: StyleSheet.hairlineWidth,
    },
    buttonText: {
        fontSize: 17,
        fontWeight: '400',
    },
    buttonTextBold: {
        fontWeight: '600',
    },
});
