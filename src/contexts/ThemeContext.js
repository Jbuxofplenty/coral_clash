import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { getThemeColors } from '../constants/Theme';

const ThemeContext = createContext({});
const THEME_STORAGE_KEY = '@coral_clash_theme';

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

export const ThemeProvider = ({ children }) => {
    const { user } = useAuth();
    const [themePreference, setThemePreference] = useState('auto'); // 'light', 'dark', 'auto'
    const [colorScheme, setColorScheme] = useState(Appearance.getColorScheme());
    const [loading, setLoading] = useState(true);

    // Load theme from AsyncStorage on mount
    useEffect(() => {
        const loadTheme = async () => {
            try {
                const savedTheme = await AsyncStorage.getItem(THEME_STORAGE_KEY);
                if (savedTheme) {
                    setThemePreference(savedTheme);
                }
            } catch (error) {
                console.error('Failed to load theme from storage:', error);
            } finally {
                setLoading(false);
            }
        };
        loadTheme();
    }, []);

    // Listen to system theme changes
    useEffect(() => {
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            setColorScheme(colorScheme);
        });

        return () => subscription.remove();
    }, []);

    // Load theme preference from user settings when user is available (sync from Firebase)
    useEffect(() => {
        if (user && user.settings && user.settings.theme) {
            setThemePreference(user.settings.theme);
            // Also save to AsyncStorage for next app start
            AsyncStorage.setItem(THEME_STORAGE_KEY, user.settings.theme).catch(console.error);
        } else if (!user) {
            // Keep the locally stored theme when user logs out
            // Don't reset to auto - let them keep their preference
        }
    }, [user]);

    // Determine the actual theme to use
    const isDarkMode =
        themePreference === 'auto' ? colorScheme === 'dark' : themePreference === 'dark';

    // Get theme colors based on current mode
    const colors = getThemeColors(isDarkMode);

    // Helper to update theme preference
    const updateThemePreference = async (newPreference) => {
        setThemePreference(newPreference);
        // Save to AsyncStorage immediately
        try {
            await AsyncStorage.setItem(THEME_STORAGE_KEY, newPreference);
        } catch (error) {
            console.error('Failed to save theme to storage:', error);
        }
    };

    const value = {
        isDarkMode,
        themePreference,
        setThemePreference: updateThemePreference,
        colors,
        loading,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
