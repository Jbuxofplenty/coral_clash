import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { moderateScale, scale } from 'react-native-size-matters';
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

    const buttonSize = scale(40);
    const buttonRadius = scale(20);
    const iconSize = moderateScale(18);

    return (
        <View
            style={[
                styles.banner,
                {
                    backgroundColor: colors.INPUT,
                    paddingVertical: scale(14),
                    paddingHorizontal: scale(16),
                },
            ]}
        >
            <Text
                style={[
                    styles.message,
                    {
                        color: colors.TEXT,
                        fontSize: moderateScale(13),
                        marginRight: scale(12),
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
                                marginLeft: scale(10),
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
