import { Block, Text, theme } from 'galio-framework';
import React, { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { LoadingScreen } from '../components';
import { DEFAULT_AVATARS, getRandomAvatarKey } from '../constants/avatars';
import { useAlert, useAuth, useTheme } from '../contexts';
import { useFirebaseFunctions } from '../hooks';

export default function Settings({ navigation: _navigation }) {
    const { t, i18n } = useTranslation();
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
            showAlert(t('settings.errors.avatarTitle'), t('settings.errors.avatarFailed'));
            // Revert on error
            setSettings(settings);
        } finally {
            setSaving(false);
        }
    };

    const handleResetSettings = () => {
        showAlert(t('settings.actions.resetTitle'), t('settings.actions.resetMessage'), [
            { text: t('settings.actions.cancel'), style: 'cancel' },
            {
                text: t('settings.actions.reset'),
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
                        showAlert(t('settings.errors.resetTitle'), t('settings.errors.resetFailed'));
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
            t('settings.dangerZone.confirmTitle'),
            t('settings.dangerZone.confirmMessage'),
            [
                { text: t('settings.dangerZone.cancel'), style: 'cancel' },
                {
                    text: t('settings.dangerZone.continue'),
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
            t('settings.dangerZone.finalConfirmTitle'),
            t('settings.dangerZone.finalConfirmMessage'),
            [
                { text: t('settings.dangerZone.cancel'), style: 'cancel' },
                {
                    text: t('settings.dangerZone.deleteAccount'),
                    style: 'destructive',
                    onPress: (text) => {
                        if (text === 'DELETE') {
                            // Don't await here - let the alert dismiss first
                            performAccountDeletion();
                        } else {
                            showAlert(
                                t('settings.dangerZone.incorrectConfirmTitle'),
                                t('settings.dangerZone.incorrectConfirmMessage'),
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
                t('settings.dangerZone.successTitle'),
                t('settings.dangerZone.successMessage'),
                [
                    {
                        text: t('settings.dangerZone.ok'),
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
                    ? t('settings.errors.deleteTimeout')
                    : t('settings.errors.deleteFailed');

            showAlert(t('settings.errors.deleteFailedTitle'), errorMessage, [
                { text: t('settings.dangerZone.cancel'), style: 'cancel' },
                {
                    text: t('settings.errors.retry'),
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

    const updateLanguage = async (languageCode) => {
        try {
            setSaving(true);
            // Change language in i18n
            await i18n.changeLanguage(languageCode);
            // The language will be cached automatically by the i18n config
        } catch (error) {
            console.error('Error changing language:', error);
            showAlert('Error', 'Failed to change language');
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
                        {t('settings.account')}
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
                        {t('settings.profileAvatar')}
                    </Text>
                    <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                        <Text size={14} color={colors.TEXT_SECONDARY} style={{ marginBottom: 16 }}>
                            {t('settings.chooseAvatar')}
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
                        {t('settings.appearance')}
                    </Text>
                    <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                        <ThemeOption
                            label={t('settings.theme.light')}
                            description={t('settings.theme.lightDescription')}
                            selected={settings.theme === 'light'}
                            onSelect={() => updateTheme('light')}
                            colors={colors}
                        />
                        <ThemeOption
                            label={t('settings.theme.dark')}
                            description={t('settings.theme.darkDescription')}
                            selected={settings.theme === 'dark'}
                            onSelect={() => updateTheme('dark')}
                            colors={colors}
                        />
                        <ThemeOption
                            label={t('settings.theme.auto')}
                            description={t('settings.theme.autoDescription')}
                            selected={settings.theme === 'auto'}
                            onSelect={() => updateTheme('auto')}
                            colors={colors}
                            last
                        />
                    </Block>
                </Block>

                {/* Language Settings */}
                <Block style={styles.section}>
                    <Text h5 bold color={colors.TEXT}>
                        {t('settings.language.title')}
                    </Text>
                    <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                        <ThemeOption
                            label={t('settings.language.english')}
                            description={t('settings.language.englishDescription')}
                            selected={i18n.language === 'en'}
                            onSelect={() => updateLanguage('en')}
                            colors={colors}
                        />
                        <ThemeOption
                            label={t('settings.language.hindi')}
                            description={t('settings.language.hindiDescription')}
                            selected={i18n.language === 'hi'}
                            onSelect={() => updateLanguage('hi')}
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
                            {t('settings.actions.resetToDefaults')}
                        </Text>
                    </TouchableOpacity>
                </Block>

                {/* Danger Zone */}
                <Block style={styles.section}>
                    <Text h5 bold color={colors.TEXT} style={{ marginBottom: 8 }}>
                        {t('settings.dangerZone.title')}
                    </Text>
                    <Block style={[styles.card, { backgroundColor: colors.CARD_BACKGROUND }]}>
                        <Text size={14} color={colors.TEXT_SECONDARY} style={{ marginBottom: 16 }}>
                            {t('settings.dangerZone.warning')}
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
                                {deleting ? t('settings.dangerZone.deletingAccount') : t('settings.dangerZone.deleteAccount')}
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
