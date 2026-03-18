import { Block, Text, theme } from 'galio-framework';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, TouchableOpacity } from 'react-native';
import { moderateScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
    const { t } = useTranslation();
    const { colors } = useTheme();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const { initializeComputerUsers, deleteComputerUsers } = useFirebaseFunctions();
    const [initializing, setInitializing] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [clearingLanguage, setClearingLanguage] = useState(false);

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
                t('components.computerUsers.successTitle'),
                result.message || t('components.computerUsers.initializeSuccess', { count: result.count || 10 }),
            );
        } catch (error) {
            console.error('Error initializing computer users:', error);
            showAlert(
                t('components.computerUsers.errorTitle'),
                error.message || t('components.computerUsers.initializeError'),
            );
        } finally {
            setInitializing(false);
        }
    };

    const handleDelete = async () => {
        // Confirm before deleting
        showAlert(
            t('components.computerUsers.confirmDeleteTitle'),
            t('components.computerUsers.confirmDeleteMessage'),
            [
                {
                    text: t('components.computerUsers.cancel'),
                    style: 'cancel',
                },
                {
                    text: t('components.computerUsers.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        setDeleting(true);
                        try {
                            const result = await deleteComputerUsers();
                            showAlert(
                                t('components.computerUsers.successTitle'),
                                result.message ||
                                    t('components.computerUsers.deleteSuccess', { count: result.deletedCount || 10 }),
                            );
                        } catch (error) {
                            console.error('Error deleting computer users:', error);
                            showAlert(
                                t('components.computerUsers.errorTitle'),
                                error.message ||
                                    t('components.computerUsers.deleteError'),
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

    const handleClearLanguage = async () => {
        setClearingLanguage(true);
        try {
            await AsyncStorage.removeItem('@coral_clash_language');
            showAlert(
                t('components.computerUsers.successTitle'),
                t('components.computerUsers.clearLanguageSuccess'),
            );
            console.log('Language preference cleared from AsyncStorage');
        } catch (error) {
            console.error('Error clearing language preference:', error);
            showAlert(t('components.computerUsers.errorTitle'), t('components.computerUsers.clearLanguageError'));
        } finally {
            setClearingLanguage(false);
        }
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
                                opacity: initializing || deleting || clearingLanguage ? 0.6 : 1,
                            },
                        ]}
                        onPress={handleInitialize}
                        disabled={initializing || deleting || clearingLanguage}
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
                                opacity: initializing || deleting || clearingLanguage ? 0.6 : 1,
                            },
                        ]}
                        onPress={handleDelete}
                        disabled={initializing || deleting || clearingLanguage}
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

                <Block style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[
                            styles.button,
                            styles.fullWidthButton,
                            {
                                backgroundColor: colors.WARNING || '#FF9500',
                                opacity: initializing || deleting || clearingLanguage ? 0.6 : 1,
                            },
                        ]}
                        onPress={handleClearLanguage}
                        disabled={initializing || deleting || clearingLanguage}
                        activeOpacity={0.8}
                    >
                        {clearingLanguage ? (
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
                                Clear Language Storage
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
    fullWidthButton: {
        flex: 1,
        width: '100%',
    },
    buttonText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
    },
});
