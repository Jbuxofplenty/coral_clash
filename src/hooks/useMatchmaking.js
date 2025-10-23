import { useState, useEffect, useCallback } from 'react';
import { useFirebaseFunctions } from './useFirebaseFunctions';
import { useAuth } from '../contexts/AuthContext';
import { db, collection, query, where, onSnapshot, doc } from '../config/firebase';
import { updateDoc } from 'firebase/firestore';

/**
 * Custom hook for managing matchmaking state and real-time updates
 */
export const useMatchmaking = ({ onMatchFound } = {}) => {
    const { user } = useAuth();
    const { joinMatchmaking, leaveMatchmaking, getMatchmakingStatus } = useFirebaseFunctions();

    const [searching, setSearching] = useState(false);
    const [queueCount, setQueueCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    // Listen to matchmaking queue for real-time updates
    useEffect(() => {
        if (!user || !user.uid) {
            setQueueCount(0);
            setSearching(false);
            return;
        }

        // Listen to the entire queue collection to get count
        const queueRef = collection(db, 'matchmakingQueue');
        const unsubscribeQueue = onSnapshot(
            queueRef,
            (snapshot) => {
                setQueueCount(snapshot.size);
            },
            (error) => {
                console.error('[useMatchmaking] Error listening to queue:', error);
            },
        );

        // Listen to user's own queue entry
        const userQueueRef = doc(db, 'matchmakingQueue', user.uid);
        const unsubscribeUserQueue = onSnapshot(
            userQueueRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setSearching(data.status === 'searching');
                } else {
                    setSearching(false);
                }
            },
            (error) => {
                console.error('[useMatchmaking] Error listening to user queue:', error);
            },
        );

        return () => {
            unsubscribeQueue();
            unsubscribeUserQueue();
        };
    }, [user]);

    // Listen for match_found notifications
    useEffect(() => {
        if (!user || !user.uid || !onMatchFound) {
            return;
        }

        const notificationsRef = collection(db, 'notifications');
        const notificationsQuery = query(
            notificationsRef,
            where('userId', '==', user.uid),
            where('type', '==', 'match_found'),
            where('read', '==', false),
        );

        const unsubscribe = onSnapshot(
            notificationsQuery,
            (snapshot) => {
                snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added') {
                        const notification = { id: change.doc.id, ...change.doc.data() };

                        // Call the callback with match data
                        if (onMatchFound && notification.gameId) {
                            onMatchFound({
                                gameId: notification.gameId,
                                opponentId: notification.opponentId,
                                opponentName: notification.opponentName,
                                opponentAvatarKey: notification.opponentAvatarKey,
                            });
                        }

                        // Mark notification as read (fire and forget)
                        const notificationRef = doc(db, 'notifications', notification.id);
                        updateDoc(notificationRef, { read: true }).catch((error) => {
                            console.error(
                                '[useMatchmaking] Error marking notification as read:',
                                error,
                            );
                        });
                    }
                });
            },
            (error) => {
                console.error('[useMatchmaking] Error listening to notifications:', error);
            },
        );

        return () => unsubscribe();
    }, [user, onMatchFound]);

    // Join matchmaking queue
    const startSearching = useCallback(async () => {
        if (!user || !user.uid) {
            setError('You must be logged in to join matchmaking');
            return { success: false };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await joinMatchmaking();
            if (result.success) {
                setSearching(true);
            }
            return result;
        } catch (err) {
            console.error('[useMatchmaking] Error joining matchmaking:', err);
            setError(err.message || 'Failed to join matchmaking');
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [user, joinMatchmaking]);

    // Leave matchmaking queue
    const stopSearching = useCallback(async () => {
        if (!user || !user.uid) {
            return { success: false };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await leaveMatchmaking();
            if (result.success) {
                setSearching(false);
            }
            return result;
        } catch (err) {
            console.error('[useMatchmaking] Error leaving matchmaking:', err);
            setError(err.message || 'Failed to leave matchmaking');
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [user, leaveMatchmaking]);

    // Refresh matchmaking status
    const refreshStatus = useCallback(async () => {
        if (!user || !user.uid) {
            return;
        }

        try {
            const result = await getMatchmakingStatus();
            if (result.success) {
                setQueueCount(result.queueCount || 0);
                setSearching(result.inQueue && result.status === 'searching');
            }
        } catch (err) {
            console.error('[useMatchmaking] Error refreshing status:', err);
        }
    }, [user, getMatchmakingStatus]);

    return {
        searching,
        queueCount,
        loading,
        error,
        startSearching,
        stopSearching,
        refreshStatus,
    };
};

export default useMatchmaking;
