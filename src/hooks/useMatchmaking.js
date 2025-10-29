import { updateDoc } from 'firebase/firestore';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { collection, db, doc, onSnapshot, query, where } from '../config/firebase';
import { useAuth } from '../contexts';
import { useFirebaseFunctions } from './useFirebaseFunctions';

/**
 * Custom hook for managing matchmaking state and real-time updates
 */
export const useMatchmaking = ({ onMatchFound } = {}) => {
    const { user } = useAuth();
    const { joinMatchmaking, leaveMatchmaking, updateMatchmakingHeartbeat, getMatchmakingStatus } =
        useFirebaseFunctions();

    const [searching, setSearching] = useState(false);
    const [queueCount, setQueueCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userTimeControlType, setUserTimeControlType] = useState(null);

    // Use ref to track searching state for AppState changes
    const searchingRef = useRef(searching);
    useEffect(() => {
        searchingRef.current = searching;
    }, [searching]);

    // Listen to matchmaking queue for real-time updates
    useEffect(() => {
        if (!user || !user.uid) {
            setQueueCount(0);
            setSearching(false);
            setUserTimeControlType(null);
            return;
        }

        // Listen to user's own queue entry first to get their time control
        const userQueueRef = doc(db, 'matchmakingQueue', user.uid);
        const unsubscribeUserQueue = onSnapshot(
            userQueueRef,
            (snapshot) => {
                if (snapshot.exists()) {
                    const data = snapshot.data();
                    setSearching(data.status === 'searching');
                    setUserTimeControlType(data.timeControl?.type || null);
                } else {
                    setSearching(false);
                    setUserTimeControlType(null);
                }
            },
            (error) => {
                console.error('[useMatchmaking] Error listening to user queue:', error);
            },
        );

        return () => {
            unsubscribeUserQueue();
        };
    }, [user]);

    // Listen to queue count
    // - When searching: show count for user's specific time control type
    // - When not searching: show total count across all time controls
    useEffect(() => {
        if (!user) {
            setQueueCount(0);
            return;
        }

        const queueRef = collection(db, 'matchmakingQueue');

        // If searching and we know the time control type, filter by it
        // Otherwise, show total count across all time controls
        const queueQuery =
            searching && userTimeControlType
                ? query(queueRef, where('timeControl.type', '==', userTimeControlType))
                : queueRef;

        const unsubscribeQueue = onSnapshot(
            queueQuery,
            (snapshot) => {
                setQueueCount(snapshot.size);
            },
            (error) => {
                console.error('[useMatchmaking] Error listening to queue:', error);
            },
        );

        return () => {
            unsubscribeQueue();
        };
    }, [user, userTimeControlType, searching]);

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

    // Monitor app state changes - leave queue when app goes to background
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            // If app goes to background or inactive while searching, leave the queue
            if (
                (nextAppState === 'background' || nextAppState === 'inactive') &&
                searchingRef.current
            ) {
                console.log('[useMatchmaking] App going to background, leaving matchmaking queue');
                leaveMatchmaking().catch((error) => {
                    console.error('[useMatchmaking] Error leaving queue on app background:', error);
                });
            }
        };

        const subscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            subscription?.remove();
        };
    }, [leaveMatchmaking]);

    // Send periodic heartbeat while searching (every 30 seconds)
    useEffect(() => {
        if (!searching || !user || !user.uid) {
            return;
        }

        // Send initial heartbeat immediately
        updateMatchmakingHeartbeat();

        // Set up interval for periodic heartbeats
        const heartbeatInterval = setInterval(() => {
            if (searchingRef.current) {
                updateMatchmakingHeartbeat();
            }
        }, 30000); // 30 seconds

        return () => {
            clearInterval(heartbeatInterval);
        };
    }, [searching, user, updateMatchmakingHeartbeat]);

    // Join matchmaking queue
    const startSearching = useCallback(
        async (timeControl = null) => {
            if (!user || !user.uid) {
                setError('You must be logged in to join matchmaking');
                return { success: false };
            }

            setLoading(true);
            setError(null);

            try {
                const result = await joinMatchmaking(timeControl);
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
        },
        [user, joinMatchmaking],
    );

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
