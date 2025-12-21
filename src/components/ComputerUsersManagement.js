import { Block, Text, theme } from 'galio-framework';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { moderateScale } from 'react-native-size-matters';

import { useAlert, useAuth, useTheme } from '../contexts';
import { useFirebaseFunctions } from '../hooks';
import Icon from './Icon';

const { width } = Dimensions.get('screen');
const isTablet = width >= 768;

/**
 * Computer Users Management Component
 * Only visible to internal users (dev features enabled)
 * Allows initialization and deletion of computer users
 */
export default function ComputerUsersManagement() {
    const { colors } = useTheme();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const { initializeComputerUsers, deleteComputerUsers } = useFirebaseFunctions();
    const [initializing, setInitializing] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Only show this component if user has internalUser flag
    const isInternalUser = useMemo(() => {
        return user?.internalUser === true;
    }, [user?.internalUser]);

    // Don't render if user is not an internal user
    if (!isInternalUser) {
        return null;
    }

    const handleInitialize = async () => {
        setInitializing(true);
        try {
            const result = await initializeComputerUsers();
            showAlert(
                'Success',
                result.message || `Successfully initialized ${result.count || 10} computer users`,
            );
        } catch (error) {
            console.error('Error initializing computer users:', error);
            showAlert(
                'Error',
                error.message || 'Failed to initialize computer users. Please try again.',
            );
        } finally {
            setInitializing(false);
        }
    };

    const handleDelete = async () => {
        // Confirm before deleting
        showAlert(
            'Confirm Deletion',
            'Are you sure you want to delete all computer users? This action cannot be undone.',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            const result = await deleteComputerUsers();
                            showAlert(
                                'Success',
                                result.message ||
                                    `Successfully deleted ${result.deletedCount || 10} computer users`,
                            );
                        } catch (error) {
                            console.error('Error deleting computer users:', error);
                            showAlert(
                                'Error',
                                error.message ||
                                    'Failed to delete computer users. Please try again.',
                            );
                        } finally {
                            setDeleting(false);
                        }
                    },
                },
            ],
            true, // vertical buttons
        );
    };

    return (
        <Block
            card
            style={[
                styles.card,
                styles.shadow,
                {
                    backgroundColor: colors.CARD_BACKGROUND,
                },
            ]}
        >
            <Block center middle style={styles.iconContainer}>
                <Block
                    style={[
                        styles.iconWrapper,
                        {
                            backgroundColor: colors.PRIMARY + '15',
                        },
                    ]}
                >
                    <Icon
                        name='users'
                        family='font-awesome'
                        size={moderateScale(60)}
                        color={colors.PRIMARY}
                    />
                </Block>
            </Block>
            <Block style={styles.contentContainer}>
                <Text
                    size={moderateScale(20)}
                    bold
                    style={[styles.title, { color: colors.TEXT }]}
                    center
                >
                    Computer Users Management
                </Text>
                <Text
                    size={moderateScale(14)}
                    style={[styles.description, { color: colors.TEXT_SECONDARY }]}
                    center
                >
                    Initialize or delete computer users used in matchmaking
                </Text>

                <Block style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[
                            styles.button,
                            {
                                backgroundColor: colors.PRIMARY,
                                opacity: initializing || deleting ? 0.6 : 1,
                            },
                        ]}
                        onPress={handleInitialize}
                        disabled={initializing || deleting}
                        activeOpacity={0.8}
                    >
                        {initializing ? (
                            <ActivityIndicator size='small' color={colors.WHITE || '#FFFFFF'} />
                        ) : (
                            <Text
                                style={[
                                    styles.buttonText,
                                    {
                                        color: colors.WHITE || '#FFFFFF',
                                    },
                                ]}
                            >
                                Initialize
                            </Text>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[
                            styles.button,
                            {
                                backgroundColor: colors.ERROR || '#FF3B30',
                                opacity: initializing || deleting ? 0.6 : 1,
                            },
                        ]}
                        onPress={handleDelete}
                        disabled={initializing || deleting}
                        activeOpacity={0.8}
                    >
                        {deleting ? (
                            <ActivityIndicator size='small' color={colors.WHITE || '#FFFFFF'} />
                        ) : (
                            <Text
                                style={[
                                    styles.buttonText,
                                    {
                                        color: colors.WHITE || '#FFFFFF',
                                    },
                                ]}
                            >
                                Delete All
                            </Text>
                        )}
                    </TouchableOpacity>
                </Block>
            </Block>
        </Block>
    );
}

const styles = StyleSheet.create({
    card: {
        marginVertical: theme.SIZES.BASE * 1.5,
        marginHorizontal: isTablet ? 'auto' : 0,
        borderWidth: 0,
        width: isTablet ? 650 : width - theme.SIZES.BASE * 2,
        alignSelf: isTablet ? 'center' : 'auto',
        borderRadius: 12,
        overflow: 'hidden',
    },
    title: {
        flexWrap: 'wrap',
        paddingBottom: 8,
    },
    description: {
        paddingTop: 8,
        paddingBottom: theme.SIZES.BASE,
    },
    contentContainer: {
        paddingVertical: theme.SIZES.BASE * 2,
        paddingHorizontal: theme.SIZES.BASE * 2,
        justifyContent: 'center',
    },
    iconContainer: {
        elevation: 1,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: theme.SIZES.BASE * 2,
        paddingBottom: theme.SIZES.BASE,
    },
    iconWrapper: {
        width: moderateScale(100),
        height: moderateScale(100),
        borderRadius: moderateScale(50),
        justifyContent: 'center',
        alignItems: 'center',
    },
    shadow: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowRadius: 8,
        shadowOpacity: 0.2,
        elevation: 4,
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: theme.SIZES.BASE,
        marginTop: theme.SIZES.BASE,
    },
    button: {
        flex: 1,
        paddingVertical: theme.SIZES.BASE,
        paddingHorizontal: theme.SIZES.BASE,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
    },
    buttonText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
    },
});
