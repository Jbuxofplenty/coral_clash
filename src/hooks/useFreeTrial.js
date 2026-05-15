import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';

const TRIAL_STORAGE_KEY = 'free_trial_games_played';
const FREE_TRIAL_LIMIT = 3;

/**
 * useFreeTrial — tracks how many vs-computer games a guest user has played.
 *
 * Only meaningful when `user` is null (authenticated users are never gated).
 *
 * Returns:
 *   trialGamesPlayed  {number}   — how many trial games have been completed
 *   isTrialExhausted  {boolean}  — true once the player has used all trial games
 *   incrementTrialCount {fn}     — call after a computer game ends (guest only)
 *   resetTrialCount   {fn}       — call after successful sign-in to clear the counter
 */
export function useFreeTrial(user) {
    const [trialGamesPlayed, setTrialGamesPlayed] = useState(0);

    // Load persisted count on mount
    useEffect(() => {
        const load = async () => {
            try {
                const stored = await AsyncStorage.getItem(TRIAL_STORAGE_KEY);
                if (stored !== null) {
                    setTrialGamesPlayed(parseInt(stored, 10) || 0);
                }
            } catch (err) {
                console.warn('[useFreeTrial] Could not read trial count:', err);
            }
        };
        load();
    }, []);

    /** Call once a vs-computer game is completed by a guest user. */
    const incrementTrialCount = useCallback(async () => {
        if (user) return; // authenticated users are never gated
        try {
            const newCount = trialGamesPlayed + 1;
            await AsyncStorage.setItem(TRIAL_STORAGE_KEY, String(newCount));
            setTrialGamesPlayed(newCount);
            return newCount;
        } catch (err) {
            console.warn('[useFreeTrial] Could not persist trial count:', err);
        }
    }, [user, trialGamesPlayed]);

    /** Call after a successful sign-in to clear the guest trial counter. */
    const resetTrialCount = useCallback(async () => {
        try {
            await AsyncStorage.removeItem(TRIAL_STORAGE_KEY);
            setTrialGamesPlayed(0);
        } catch (err) {
            console.warn('[useFreeTrial] Could not reset trial count:', err);
        }
    }, []);

    const isTrialExhausted = !user && trialGamesPlayed >= FREE_TRIAL_LIMIT;

    return {
        trialGamesPlayed,
        isTrialExhausted,
        incrementTrialCount,
        resetTrialCount,
        FREE_TRIAL_LIMIT,
    };
}
