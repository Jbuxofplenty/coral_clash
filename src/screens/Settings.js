import { Block, Button, Switch, Text, theme } from 'galio-framework';
import React, { useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    Image,
} from 'react-native';

import { materialTheme } from '../constants';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useFirebaseFunctions } from '../hooks/useFirebaseFunctions';
import { DEFAULT_AVATARS, getRandomAvatarKey } from '../constants/avatars';

export default function Settings({ navigation }) {
    const { user, refreshUserData } = useAuth();
    const { colors, isDarkMode, setThemePreference } = useTheme();
    const { getUserSettings, updateUserSettings, resetUserSettings } = useFirebaseFunctions();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState(null);

    useEffect(() => {
        if (user && user.uid) {
            loadSettings();
        }
    }, [user]);

    const loadSettings = async () => {
        if (!user || !user.uid) return;

        try {
            setLoading(true);
            const result = await getUserSettings();
            setSettings(result.settings);
        } catch (error) {
            // Silently fail for new users - just use default settirngs with random avatar
            setSettings({ theme: 'auto', avatarKey: getRandomAvatarKey() });
        } finally {
            setLoading(false);
        }
    };

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
            Alert.alert('Error', 'Failed to save avatar selection');
            // Revert on error
            setSettings(settings);
        } finally {
            setSaving(false);
        }
    };

    const handleResetSettings = () => {
        Alert.alert('Reset Settings', 'Are you sure you want to reset all settings to defaults?', [
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
                        Alert.alert('Error', 'Failed to reset settings');
                    } finally {
                        setSaving(false);
                    }
                },
            },
        ]);
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
            Alert.alert('Error', 'Failed to save theme preference');
            // Revert on error
            setSettings(settings);
            setThemePreference(settings.theme);
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <Block flex center middle style={{ backgroundColor: colors.BACKGROUND }}>
                <ActivityIndicator size='large' color={colors.PRIMARY} />
            </Block>
        );
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
                        disabled={saving}
                    >
                        <Text size={14} color={colors.PRIMARY} center style={{ fontWeight: '600' }}>
                            Reset to Defaults
                        </Text>
                    </TouchableOpacity>
                </Block>
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
                    backgroundColor: selected ? colors.PRIMARY + '20' : colors.BACKGROUND,
                    borderColor: selected ? colors.PRIMARY : 'transparent',
                },
            ]}
        >
            <Image
                source={DEFAULT_AVATARS[avatarKey]}
                style={styles.avatarImage}
                resizeMode='contain'
            />
            <Text
                size={12}
                center
                bold={selected}
                color={colors.TEXT}
                style={{ marginTop: 4, textTransform: 'capitalize' }}
            >
                {avatarKey}
            </Text>
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
    button: {
        marginTop: theme.SIZES.BASE * 2,
        width: '100%',
        height: 48,
        borderRadius: 8,
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
        padding: theme.SIZES.BASE,
        borderRadius: 12,
        marginBottom: theme.SIZES.BASE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
    },
    avatarImage: {
        width: '60%',
        height: '60%',
    },
});
