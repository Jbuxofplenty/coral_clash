import React, { createContext, useState, useEffect, useContext } from 'react';
import { Appearance } from 'react-native';
import { useAuth } from './AuthContext';
import { useFirebaseFunctions } from '../hooks/useFirebaseFunctions';

const ThemeContext = createContext({});

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
    const [loading, setLoading] = useState(false);

    // Listen to system theme changes
    useEffect(() => {
        const subscription = Appearance.addChangeListener(({ colorScheme }) => {
            setColorScheme(colorScheme);
        });

        return () => subscription.remove();
    }, []);

    // Reset theme preference when user logs out
    useEffect(() => {
        if (!user) {
            setThemePreference('auto');
        }
    }, [user]);

    // Determine the actual theme to use
    const isDarkMode =
        themePreference === 'auto' ? colorScheme === 'dark' : themePreference === 'dark';

    // Function to load theme preference (called manually from Settings screen)
    const loadThemePreference = async (getUserSettings) => {
        if (user && user.uid) {
            try {
                const result = await getUserSettings();
                if (result.settings && result.settings.theme) {
                    setThemePreference(result.settings.theme);
                }
            } catch (error) {
                // Silently fail - just use current theme
            }
        }
    };

    const value = {
        isDarkMode,
        themePreference,
        setThemePreference,
        loadThemePreference,
        loading,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};
