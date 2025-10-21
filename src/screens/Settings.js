import { Block, Button, Switch, Text, theme } from 'galio-framework';
import React, { useEffect, useState } from 'react';
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
import { useFirebaseFunctions } from '../hooks/useFirebaseFunctions';
import { DEFAULT_AVATARS, getRandomAvatarKey } from '../constants/avatars';

export default function Settings({ navigation }) {
    const { user, refreshUserData } = useAuth();
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
            // Silently fail for new users - just use default settings with random avatar
            setSettings({ theme: 'auto', avatarKey: getRandomAvatarKey() });
        } finally {
            setLoading(false);
        }
    };

    const updateAvatar = (avatarKey) => {
        setSettings((prev) => ({
            ...prev,
            avatarKey,
        }));
    };

    const handleSaveSettings = async () => {
        try {
            setSaving(true);
            await updateUserSettings(settings);

            // Refresh user data to update avatar in header/drawer
            await refreshUserData();

            Alert.alert('Success', 'Settings saved successfully');
        } catch (error) {
            console.error('Error saving settings:', error);
            Alert.alert('Error', 'Failed to save settings');
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
                        setSettings(result.settings);
                        Alert.alert('Success', 'Settings reset to defaults');
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

    const updateTheme = (theme) => {
        setSettings((prev) => ({
            ...prev,
            theme,
        }));
    };

    if (loading) {
        return (
            <Block flex center middle>
                <ActivityIndicator size='large' color={materialTheme.COLORS.PRIMARY} />
            </Block>
        );
    }

    if (!settings) {
        return (
            <Block flex center middle>
                <Text>Failed to load settings</Text>
            </Block>
        );
    }

    return (
        <Block flex style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                {/* User Info */}
                <Block style={styles.section}>
                    <Text h5 bold color={materialTheme.COLORS.TEXT}>
                        Account
                    </Text>
                    <Block style={styles.card}>
                        <Text size={16} bold>
                            {user?.displayName || 'User'}
                        </Text>
                        <Text size={14} color={materialTheme.COLORS.MUTED} style={{ marginTop: 4 }}>
                            {user?.email}
                        </Text>
                    </Block>
                </Block>

                {/* Avatar Selection */}
                <Block style={styles.section}>
                    <Text h5 bold color={materialTheme.COLORS.TEXT}>
                        Profile Avatar
                    </Text>
                    <Block style={styles.card}>
                        <Text
                            size={14}
                            color={materialTheme.COLORS.MUTED}
                            style={{ marginBottom: 16 }}
                        >
                            Choose your ocean-themed avatar
                        </Text>
                        <Block row style={styles.avatarGrid}>
                            {Object.keys(DEFAULT_AVATARS).map((avatarKey) => (
                                <AvatarOption
                                    key={avatarKey}
                                    avatarKey={avatarKey}
                                    selected={settings.avatarKey === avatarKey}
                                    onSelect={() => updateAvatar(avatarKey)}
                                />
                            ))}
                        </Block>
                    </Block>
                </Block>

                {/* Theme Settings */}
                <Block style={styles.section}>
                    <Text h5 bold color={materialTheme.COLORS.TEXT}>
                        Appearance
                    </Text>
                    <Block style={styles.card}>
                        <ThemeOption
                            label='Light'
                            description='Always use light theme'
                            selected={settings.theme === 'light'}
                            onSelect={() => updateTheme('light')}
                        />
                        <ThemeOption
                            label='Dark'
                            description='Always use dark theme'
                            selected={settings.theme === 'dark'}
                            onSelect={() => updateTheme('dark')}
                        />
                        <ThemeOption
                            label='Auto'
                            description='Match system theme'
                            selected={settings.theme === 'auto'}
                            onSelect={() => updateTheme('auto')}
                            last
                        />
                    </Block>
                </Block>

                {/* Action Buttons */}
                <Block style={styles.section}>
                    <Button
                        color={materialTheme.COLORS.PRIMARY}
                        style={styles.button}
                        onPress={handleSaveSettings}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color='#fff' />
                        ) : (
                            <Text bold size={16} color='#fff'>
                                Save Settings
                            </Text>
                        )}
                    </Button>

                    <TouchableOpacity
                        style={styles.textButton}
                        onPress={handleResetSettings}
                        disabled={saving}
                    >
                        <Text size={14} color={materialTheme.COLORS.MUTED} center>
                            Reset to Defaults
                        </Text>
                    </TouchableOpacity>
                </Block>
            </ScrollView>
        </Block>
    );
}

function AvatarOption({ avatarKey, selected, onSelect }) {
    return (
        <TouchableOpacity
            onPress={onSelect}
            style={[styles.avatarOption, selected && styles.avatarOptionSelected]}
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
                style={{ marginTop: 4, textTransform: 'capitalize' }}
            >
                {avatarKey}
            </Text>
        </TouchableOpacity>
    );
}

function ThemeOption({ label, description, selected, onSelect, last = false }) {
    return (
        <TouchableOpacity
            onPress={onSelect}
            style={[styles.themeOption, last && styles.themeOptionLast]}
        >
            <Block flex>
                <Text size={16} bold={selected}>
                    {label}
                </Text>
                <Text size={14} color={materialTheme.COLORS.MUTED} style={{ marginTop: 4 }}>
                    {description}
                </Text>
            </Block>
            {selected && (
                <Block
                    style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: materialTheme.COLORS.PRIMARY,
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
        backgroundColor: '#f9f9f9',
    },
    section: {
        paddingHorizontal: theme.SIZES.BASE * 2,
        marginTop: theme.SIZES.BASE * 2,
    },
    card: {
        backgroundColor: theme.COLORS.WHITE,
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
        borderBottomColor: '#e8e8e8',
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
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
        marginBottom: theme.SIZES.BASE,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'transparent',
    },
    avatarOptionSelected: {
        borderColor: materialTheme.COLORS.PRIMARY,
        backgroundColor: '#e3f2fd',
    },
    avatarImage: {
        width: '60%',
        height: '60%',
    },
});
