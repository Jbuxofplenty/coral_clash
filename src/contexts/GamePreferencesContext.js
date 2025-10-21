import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const GamePreferencesContext = createContext({});
const GAME_PREFS_STORAGE_KEY = '@coral_clash_game_preferences';

export const useGamePreferences = () => {
    const context = useContext(GamePreferencesContext);
    if (!context) {
        throw new Error('useGamePreferences must be used within a GamePreferencesProvider');
    }
    return context;
};

export const GamePreferencesProvider = ({ children }) => {
    const [isBoardFlipped, setIsBoardFlipped] = useState(false);
    const [loading, setLoading] = useState(true);

    // Load preferences from AsyncStorage on mount
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const savedPrefs = await AsyncStorage.getItem(GAME_PREFS_STORAGE_KEY);
                if (savedPrefs) {
                    const prefs = JSON.parse(savedPrefs);
                    if (prefs.isBoardFlipped !== undefined) {
                        setIsBoardFlipped(prefs.isBoardFlipped);
                    }
                }
            } catch (error) {
                console.error('Failed to load game preferences from storage:', error);
            } finally {
                setLoading(false);
            }
        };
        loadPreferences();
    }, []);

    // Helper to toggle board flip
    const toggleBoardFlip = async () => {
        const newValue = !isBoardFlipped;
        setIsBoardFlipped(newValue);

        // Save to AsyncStorage
        try {
            const prefs = { isBoardFlipped: newValue };
            await AsyncStorage.setItem(GAME_PREFS_STORAGE_KEY, JSON.stringify(prefs));
        } catch (error) {
            console.error('Failed to save game preferences to storage:', error);
        }
    };

    const value = {
        isBoardFlipped,
        toggleBoardFlip,
        loading,
    };

    return (
        <GamePreferencesContext.Provider value={value}>{children}</GamePreferencesContext.Provider>
    );
};
