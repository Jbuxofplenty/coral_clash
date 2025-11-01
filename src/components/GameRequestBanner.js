import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useTheme } from '../contexts';
import Icon from './Icon';

/**
 * GameRequestBanner - Banner component for game request interactions (undo/reset)
 * @param {Object} props
 * @param {string} props.message - The message to display
 * @param {string} props.mode - 'waiting' (shows cancel button) or 'approval' (shows accept/decline buttons)
 * @param {function} props.onCancel - Callback for cancel action (waiting mode only)
 * @param {function} props.onDecline - Callback for decline action (approval mode only)
 * @param {function} props.onAccept - Callback for accept action (approval mode only)
 */
const GameRequestBanner = ({ message, mode = 'waiting', onCancel, onDecline, onAccept }) => {
    const { colors } = useTheme();
    const { height } = useWindowDimensions();

    // Use compact mode on smaller screens (iPhone SE, etc.)
    const isCompact = height < 700;

    const buttonSize = isCompact ? 32 : 40;
    const buttonRadius = isCompact ? 16 : 20;
    const iconSize = isCompact ? 14 : 18;

    return (
        <View
            style={[
                styles.banner,
                {
                    backgroundColor: colors.INPUT,
                    paddingVertical: isCompact ? 8 : 14,
                    paddingHorizontal: isCompact ? 12 : 16,
                },
            ]}
        >
            <Text
                style={[
                    styles.message,
                    {
                        color: colors.TEXT,
                        fontSize: isCompact ? 12 : 15,
                        marginRight: isCompact ? 8 : 12,
                    },
                ]}
            >
                {message}
            </Text>

            {mode === 'waiting' ? (
                <TouchableOpacity
                    onPress={onCancel}
                    style={[
                        styles.button,
                        {
                            width: buttonSize,
                            height: buttonSize,
                            borderRadius: buttonRadius,
                            backgroundColor: colors.ERROR + '15',
                        },
                    ]}
                >
                    <Icon name='times' family='font-awesome' size={iconSize} color={colors.ERROR} />
                </TouchableOpacity>
            ) : (
                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        onPress={onDecline}
                        style={[
                            styles.button,
                            {
                                width: buttonSize,
                                height: buttonSize,
                                borderRadius: buttonRadius,
                                backgroundColor: colors.ERROR + '15',
                            },
                        ]}
                    >
                        <Icon
                            name='times'
                            family='font-awesome'
                            size={iconSize}
                            color={colors.ERROR}
                        />
                    </TouchableOpacity>
                    <TouchableOpacity
                        onPress={onAccept}
                        style={[
                            styles.button,
                            {
                                width: buttonSize,
                                height: buttonSize,
                                borderRadius: buttonRadius,
                                backgroundColor: colors.SUCCESS + '15',
                                marginLeft: isCompact ? 8 : 10,
                            },
                        ]}
                    >
                        <Icon
                            name='check'
                            family='font-awesome'
                            size={iconSize}
                            color={colors.SUCCESS}
                        />
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    banner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    message: {
        fontWeight: '600',
        flex: 1,
    },
    button: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonGroup: {
        flexDirection: 'row',
    },
});

export default GameRequestBanner;

