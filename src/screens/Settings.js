import { Block, Text, theme } from 'galio-framework';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';

import { LoadingScreen } from '../components';
import { DEFAULT_AVATARS, getRandomAvatarKey } from '../constants/avatars';
import { useAlert, useAuth, useTheme } from '../contexts';
import { useFirebaseFunctions } from '../hooks';

export default function Settings({ navigation: _navigation }) {
    const { user, refreshUserData, logOut } = useAuth();
    const { colors, setThemePreference } = useTheme();
    const { showAlert } = useAlert();
    const { getUserSettings, updateUserSettings, resetUserSettings, deleteAccount } =
        useFirebaseFunctions();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        const loadSettings = async () => {
            if (!user || !user.uid) return;

            try {
                setLoading(true);
                const result = await getUserSettings();
                setSettings(result.settings);
            } catch (_error) {
                // Silently fail for new users - just use default settirngs with random avatar
                setSettings({ theme: 'auto', avatarKey: getRandomAvatarKey() });
            } finally {
                setLoading(false);
            }
        };

        if (user && user.uid) {
            loadSettings();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user]);

    const updateAvatar = async (avatarKey) => {
        const newSettings = {
            ...settings,
            avatarKey,
        };
        setSettings(newSettings);

        try {
            setSaving(true);
            await updateUserSettings(newSettings);

            // Refresh user data to update avatar in header/drawer
            await refreshUserData();
        } catch (error) {
            console.error('Error saving avatar:', error);
            showAlert('Error', 'Failed to save avatar selection');
            // Revert on error
            setSettings(settings);
        } finally {
            setSaving(false);
        }
    };

    const handleResetSettings = () => {
        showAlert('Reset Settings', 'Are you sure you want to reset all settings to defaults?', [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Reset',
                style: 'destructive',
                onPress: async () => {
                    try {
                        setSaving(true);
                        const result = await resetUserSettings();

                        // Update local state
                        setSettings(result.settings);

                        // Update theme context immediately
                        setThemePreference(result.settings.theme);

                        // Refresh user data to update avatar in header/drawer
                        await refreshUserData();
                    } catch (error) {
                        console.error('Error resetting settings:', error);
                        showAlert('Error', 'Failed to reset settings');
                    } finally {
                        setSaving(false);
                    }
                },
            },
        ]);
    };

    const handleDeleteAccount = () => {
        // First confirmation - explain consequences
        showAlert(
            'Delete Account',
            'This action is permanent and cannot be undone.\n\n' +
                '• All your personal data will be removed\n' +
                '• Your games will continue but you will appear as "Anonymous"\n' +
                '• Your friends and friend requests will be removed\n' +
                '• Active games will be forfeited\n\n' +
                'Are you sure you want to continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Continue',
                    style: 'destructive',
                    onPress: () => {
                        // Second confirmation - require typing DELETE
                        showDeleteConfirmation();
                    },
                },
            ],
        );
    };

    const showDeleteConfirmation = () => {
        Alert.prompt(
            'Confirm Account Deletion',
            'To confirm, please type DELETE (all caps) below:',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete Account',
                    style: 'destructive',
                    onPress: (text) => {
                        if (text === 'DELETE') {
                            // Don't await here - let the alert dismiss first
                            performAccountDeletion();
                        } else {
                            showAlert(
                                'Incorrect Confirmation',
                                'You must type DELETE exactly to confirm account deletion.',
                            );
                        }
                    },
                },
            ],
            'plain-text',
        );
    };

    const performAccountDeletion = async () => {
        try {
            setDeleting(true);

            // Call the delete account function with timeout
            // Create a promise that rejects after 30 seconds
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Request timeout')), 30000);
            });

            // Race between the actual call and the timeout
            await Promise.race([deleteAccount(), timeoutPromise]);

            setDeleting(false);

            // Show success message, then logout when dismissed
            showAlert(
                'Account Deleted',
                'Your account has been successfully deleted. You will now be logged out.',
                [
                    {
                        text: 'OK',
                        onPress: async () => {
                            // Log out after user acknowledges (AuthProvider handles navigation)
                            await logOut();
                        },
                    },
                ],
            );
        } catch (error) {
            console.error('Error deleting account:', error);
            setDeleting(false);

            // Determine error message
            const errorMessage =
                error.message === 'Request timeout'
                    ? 'The request timed out. Please check your connection and try again.'
                    : 'Failed to delete account. Please try again or contact support if the problem persists.';

            showAlert('Deletion Failed', errorMessage, [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Retry',
                    onPress: () => handleDeleteAccount(),
                },
            ]);
        }
    };

    const updateTheme = async (themeValue) => {
        const newSettings = {
            ...settings,
            theme: themeValue,
        };
        setSettings(newSettings);
        // Update theme context immediately for instant preview
        setThemePreference(themeValue);

        try {
            setSaving(true);
            await updateUserSettings(newSettings);
            await refreshUserData();
        } catch (error) {
            console.error('Error saving theme:', error);
            showAlert('Error', 'Failed to save theme preference');
            // Revert on error
            setSettings(settings);
            setThemePreference(settings.theme);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <LoadingScreen />;
    }

    if (!settings) {
        return (
            <Block flex center middle style={{ backgroundColor: colors.BACKGROUND }}>
                <Text color={colors.TEXT}>Failed to load settings</Text>
            </Block>
        );
    }

    return (
        <Block flex style={[styles.container, { backgroundColor: colors.BACKGROUND }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* User Info */}
                <Block style={styles.section}>
                    <Text h5 bold color={colors.TEXT}>
                        Account
                    </Text>
                    <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                        <Text size={16} bold color={colors.TEXT}>
                            {user?.displayName || 'User'}
                        </Text>
                        <Text size={14} color={colors.TEXT_SECONDARY} style={{ marginTop: 4 }}>
                            {user?.email}
                        </Text>
                    </Block>
                </Block>

                {/* Avatar Selection */}
                <Block style={styles.section}>
                    <Text h5 bold color={colors.TEXT}>
                        Profile Avatar
                    </Text>
                    <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                        <Text size={14} color={colors.TEXT_SECONDARY} style={{ marginBottom: 16 }}>
                            Choose your ocean-themed avatar
                        </Text>
                        <Block row style={styles.avatarGrid}>
                            {Object.keys(DEFAULT_AVATARS).map((avatarKey) => (
                                <AvatarOption
                                    key={avatarKey}
                                    avatarKey={avatarKey}
                                    selected={settings.avatarKey === avatarKey}
                                    onSelect={() => updateAvatar(avatarKey)}
                                    colors={colors}
                                />
                            ))}
                        </Block>
                    </Block>
                </Block>

                {/* Theme Settings */}
                <Block style={styles.section}>
                    <Text h5 bold color={colors.TEXT}>
                        Appearance
                    </Text>
                    <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                        <ThemeOption
                            label='Light'
                            description='Always use light theme'
                            selected={settings.theme === 'light'}
                            onSelect={() => updateTheme('light')}
                            colors={colors}
                        />
                        <ThemeOption
                            label='Dark'
                            description='Always use dark theme'
                            selected={settings.theme === 'dark'}
                            onSelect={() => updateTheme('dark')}
                            colors={colors}
                        />
                        <ThemeOption
                            label='Auto'
                            description='Match system theme'
                            selected={settings.theme === 'auto'}
                            onSelect={() => updateTheme('auto')}
                            colors={colors}
                            last
                        />
                    </Block>
                </Block>

                {/* Action Buttons */}
                <Block style={styles.section}>
                    <TouchableOpacity
                        style={styles.textButton}
                        onPress={handleResetSettings}
                        disabled={saving || deleting}
                    >
                        <Text size={14} color={colors.PRIMARY} center style={{ fontWeight: '600' }}>
                            Reset to Defaults
                        </Text>
                    </TouchableOpacity>
                </Block>

                {/* Danger Zone */}
                <Block style={styles.section}>
                    <Text h5 bold color={colors.TEXT} style={{ marginBottom: 8 }}>
                        Danger Zone
                    </Text>
                    <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                        <Text size={14} color={colors.TEXT_SECONDARY} style={{ marginBottom: 16 }}>
                            Once you delete your account, there is no going back. Please be certain.
                        </Text>
                        <TouchableOpacity
                            style={[
                                styles.deleteButton,
                                (saving || deleting) && styles.deleteButtonDisabled,
                            ]}
                            onPress={handleDeleteAccount}
                            disabled={saving || deleting}
                        >
                            <Text
                                size={16}
                                bold
                                color='#fff'
                                style={{ textAlign: 'center' }}
                            >
                                {deleting ? 'Deleting Account...' : 'Delete Account'}
                            </Text>
                        </TouchableOpacity>
                    </Block>
                </Block>

                {/* Bottom padding */}
                <Block style={{ height: 40 }} />
            </ScrollView>
        </Block>
    );
}

function AvatarOption({ avatarKey, selected, onSelect, colors }) {
    return (
        <TouchableOpacity
            onPress={onSelect}
            style={[
                styles.avatarOption,
                {
                    backgroundColor: selected ? colors.PRIMARY + '20' : 'rgba(255, 255, 255, 0.1)',
                    borderColor: selected ? colors.PRIMARY : 'rgba(255, 255, 255, 0.15)',
                },
            ]}
        >
            <Image
                source={DEFAULT_AVATARS[avatarKey]}
                style={styles.avatarImage}
                resizeMode='contain'
            />
        </TouchableOpacity>
    );
}

function ThemeOption({ label, description, selected, onSelect, colors, last = false }) {
    return (
        <TouchableOpacity
            onPress={onSelect}
            style={[
                styles.themeOption,
                { borderBottomColor: colors.BORDER_COLOR },
                last && styles.themeOptionLast,
            ]}
        >
            <Block flex>
                <Text size={16} bold={selected} color={colors.TEXT}>
                    {label}
                </Text>
                <Text size={14} color={colors.TEXT_SECONDARY} style={{ marginTop: 4 }}>
                    {description}
                </Text>
            </Block>
            {selected && (
                <Block
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: colors.PRIMARY,
                        justifyContent: 'center',
                        alignItems: 'center',
                    }}
                >
                    <Text size={16} color='#fff' bold>
                        ✓
                    </Text>
                </Block>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    section: {
        paddingHorizontal: theme.SIZES.BASE * 2,
        marginTop: theme.SIZES.BASE * 2,
    },
    card: {
        borderRadius: 12,
        marginTop: theme.SIZES.BASE,
        padding: theme.SIZES.BASE * 2,
        shadowColor: theme.COLORS.BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 4,
        shadowOpacity: 0.1,
        elevation: 2,
    },
    themeOption: {
        paddingVertical: theme.SIZES.BASE * 2,
        borderBottomWidth: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    themeOptionLast: {
        borderBottomWidth: 0,
    },
    textButton: {
        marginTop: theme.SIZES.BASE * 2,
        paddingVertical: theme.SIZES.BASE,
    },
    avatarGrid: {
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    avatarOption: {
        width: '30%',
        aspectRatio: 1,
        padding: theme.SIZES.BASE * 0.5,
        borderRadius: 12,
        marginBottom: theme.SIZES.BASE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
        paddingVertical: theme.SIZES.BASE * 1.5,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },
    deleteButtonDisabled: {
        backgroundColor: '#FF3B3080',
        opacity: 0.6,
    },
});
