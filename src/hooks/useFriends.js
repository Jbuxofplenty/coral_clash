import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { collection, db, onSnapshot, query, where } from '../config/firebase';
import { useAlert, useAuth } from '../contexts';
import { useFirebaseFunctions } from './useFirebaseFunctions';

export const useFriends = () => {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { showAlert } = useAlert();
    const { getFriends, respondToFriendRequest, removeFriend } = useFirebaseFunctions();

    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [friends, setFriends] = useState([]);
    const [incomingRequests, setIncomingRequests] = useState([]);
    const [outgoingRequests, setOutgoingRequests] = useState([]);
    const [removingFriendId, setRemovingFriendId] = useState(null);
    const [acceptingRequestId, setAcceptingRequestId] = useState(null);
    const [decliningRequestId, setDecliningRequestId] = useState(null);

    // Set up real-time Firestore listeners when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            if (!user || !user.uid) return;

            let friendsUnsubscribe = null;
            let incomingUnsubscribe = null;
            let outgoingUnsubscribe = null;

            const setupListeners = async () => {
                try {
                    setLoading(true);
                    // Always reload friends data when screen comes into focus
                    // This ensures avatars and display names are up-to-date
                    const result = await getFriends();
                    setFriends(result.friends || []);
                    setIncomingRequests(result.incomingRequests || []);
                    setOutgoingRequests(result.outgoingRequests || []);
                    setLoading(false);

                    // Listen to user's friends subcollection
                    const friendsRef = collection(db, 'users', user.uid, 'friends');
                    friendsUnsubscribe = onSnapshot(
                        friendsRef,
                        async (_snapshot) => {
                            // Whenever the friends subcollection changes (add, delete, modify),
                            // fetch the updated friends list
                            try {
                                const result = await getFriends();
                                setFriends(result.friends || []);

                                // Clear loading state if the friend being removed is no longer in the list
                                setRemovingFriendId((currentId) => {
                                    if (
                                        currentId &&
                                        !result.friends.some((f) => f.id === currentId)
                                    ) {
                                        return null;
                                    }
                                    return currentId;
                                });
                            } catch (error) {
                                console.error('Error fetching friends:', error);
                            }
                        },
                        (error) => {
                            console.error('Error in friends listener:', error);
                        },
                    );

                    // Listen to incoming friend requests
                    const incomingQuery = query(
                        collection(db, 'friendRequests'),
                        where('to', '==', user.uid),
                        where('status', '==', 'pending'),
                    );
                    incomingUnsubscribe = onSnapshot(
                        incomingQuery,
                        async () => {
                            try {
                                const result = await getFriends();
                                setIncomingRequests(result.incomingRequests || []);

                                // Clear loading states if requests no longer exist
                                setAcceptingRequestId((currentId) => {
                                    if (
                                        currentId &&
                                        !result.incomingRequests.some(
                                            (r) => r.requestId === currentId,
                                        )
                                    ) {
                                        return null;
                                    }
                                    return currentId;
                                });
                                setDecliningRequestId((currentId) => {
                                    if (
                                        currentId &&
                                        !result.incomingRequests.some(
                                            (r) => r.requestId === currentId,
                                        )
                                    ) {
                                        return null;
                                    }
                                    return currentId;
                                });
                            } catch (error) {
                                console.error('Error fetching incoming requests:', error);
                            }
                        },
                        (error) => {
                            console.error('Error in incoming requests listener:', error);
                        },
                    );

                    // Listen to outgoing friend requests
                    const outgoingQuery = query(
                        collection(db, 'friendRequests'),
                        where('from', '==', user.uid),
                        where('status', '==', 'pending'),
                    );
                    outgoingUnsubscribe = onSnapshot(
                        outgoingQuery,
                        async () => {
                            try {
                                const result = await getFriends();
                                setOutgoingRequests(result.outgoingRequests || []);

                                // Clear declining state if request no longer exists (for cancellations)
                                setDecliningRequestId((currentId) => {
                                    if (
                                        currentId &&
                                        !result.outgoingRequests.some(
                                            (r) => r.requestId === currentId,
                                        )
                                    ) {
                                        return null;
                                    }
                                    return currentId;
                                });
                            } catch (error) {
                                console.error('Error fetching outgoing requests:', error);
                            }
                        },
                        (error) => {
                            console.error('Error in outgoing requests listener:', error);
                        },
                    );
                } catch (error) {
                    console.error('Error setting up listeners:', error);
                    setLoading(false);
                }
            };

            setupListeners();

            // Cleanup listeners when screen loses focus or unmounts
            return () => {
                if (friendsUnsubscribe) friendsUnsubscribe();
                if (incomingUnsubscribe) incomingUnsubscribe();
                if (outgoingUnsubscribe) outgoingUnsubscribe();
            };
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [user]),
    );

    const handleRefresh = async () => {
        if (!user || !user.uid || refreshing) return;

        try {
            setRefreshing(true);
            const result = await getFriends();
            setFriends(result.friends || []);
            setIncomingRequests(result.incomingRequests || []);
            setOutgoingRequests(result.outgoingRequests || []);
        } catch (error) {
            console.error('Error refreshing friends:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleRemoveFriend = (friendId, friendDisplayName) => {
        showAlert(
            t('hooks.friends.removeFriendTitle'),
            t('hooks.friends.removeFriendMessage', { friendName: friendDisplayName }),
            [
                { text: t('hooks.friends.cancel'), style: 'cancel' },
                {
                    text: t('hooks.friends.remove'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setRemovingFriendId(friendId);
                            await removeFriend(friendId);
                            // Note: Real-time listener will auto-update the UI
                        } catch (error) {
                            console.error('Error removing friend:', error);
                            showAlert(t('hooks.friends.errorTitle'), t('hooks.friends.errorRemove'));
                            setRemovingFriendId(null);
                        }
                    },
                },
            ],
        );
    };

    const handleAcceptRequest = async (requestId, _userId) => {
        try {
            setAcceptingRequestId(requestId);
            await respondToFriendRequest(requestId, true);
            // Note: Real-time listener will auto-update the UI
        } catch (error) {
            console.error('Error accepting friend request:', error);
            showAlert(t('hooks.friends.errorTitle'), t('hooks.friends.errorAccept'));
            setAcceptingRequestId(null);
        }
    };

    const handleDeclineRequest = async (requestId) => {
        try {
            setDecliningRequestId(requestId);
            await respondToFriendRequest(requestId, false);
            // Note: Real-time listener will auto-update the UI
        } catch (error) {
            console.error('Error declining friend request:', error);
            showAlert(t('hooks.friends.errorTitle'), t('hooks.friends.errorDecline'));
            setDecliningRequestId(null);
        }
    };

    const handleCancelRequest = async (requestId, displayName) => {
        showAlert(t('hooks.friends.cancelRequestTitle'), t('hooks.friends.cancelRequestMessage', { displayName }), [
            { text: t('hooks.friends.no'), style: 'cancel' },
            {
                text: t('hooks.friends.yesCancel'),
                style: 'destructive',
                onPress: async () => {
                    try {
                        setDecliningRequestId(requestId);
                        await respondToFriendRequest(requestId, false);
                        // Note: Real-time listener will auto-update the UI
                    } catch (error) {
                        console.error('Error canceling friend request:', error);
                        showAlert(t('hooks.friends.errorTitle'), t('hooks.friends.errorCancelRequest'));
                        setDecliningRequestId(null);
                    }
                },
            },
        ]);
    };

    return {
        // State
        loading,
        refreshing,
        friends,
        incomingRequests,
        outgoingRequests,
        removingFriendId,
        acceptingRequestId,
        decliningRequestId,

        // Handlers
        handleRefresh,
        handleRemoveFriend,
        handleAcceptRequest,
        handleDeclineRequest,
        handleCancelRequest,
    };
};
