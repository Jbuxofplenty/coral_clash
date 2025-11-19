import { httpsCallable } from 'firebase/functions';
import { useCallback, useEffect } from 'react';
import { functions } from '../config/firebase';
import { useNotifications } from '../contexts';

/**
 * Custom hook to handle notification logic and navigation tracking
 */
export const useNotificationHandlers = (navigationRef) => {
    const { setActiveGameId, decrementBadge } = useNotifications();

    // Track current game for filtering notifications
    useEffect(() => {
        if (!navigationRef?.current) return;

        // Function to update active game
        const updateActiveGame = () => {
            try {
                const state = navigationRef.current?.getRootState();
                if (state && state.routes && state.routes.length > 0) {
                    // Get the current route - might be nested in a navigator
                    const route = state.routes[state.index];

                    // Check if we're on the Game screen (might be nested)
                    let currentGameId = null;

                    if (route.name === 'Game' && route.params?.gameId) {
                        currentGameId = route.params.gameId;
                    } else if (route.state) {
                        // Check nested routes (e.g., in a tab navigator)
                        const nestedRoute = route.state.routes[route.state.index];
                        if (nestedRoute?.name === 'Game' && nestedRoute.params?.gameId) {
                            currentGameId = nestedRoute.params.gameId;
                        }
                    }

                    setActiveGameId(currentGameId);
                }
            } catch (error) {
                console.error('Error tracking route:', error);
            }
        };

        // Get initial route
        updateActiveGame();

        // Listen for navigation changes
        const unsubscribe = navigationRef.current.addListener('state', updateActiveGame);

        return unsubscribe;
    }, [navigationRef, setActiveGameId]);

    // Handle accepting notifications
    const handleAccept = useCallback(
        async (notificationData) => {
            try {
                const notificationType = notificationData.data.type;

                if (notificationType === 'game_request') {
                    // Accept game request
                    const respondToGameInvite = httpsCallable(functions, 'respondToGameInvite');
                    const result = await respondToGameInvite({
                        gameId: notificationData.data.gameId,
                        accept: true,
                    });

                    // Navigate to game
                    if (result.data.gameId && navigationRef.current) {
                        navigationRef.current.navigate('Game', {
                            gameId: result.data.gameId,
                            isPvP: true,
                        });
                    }
                } else if (notificationType === 'friend_request') {
                    // Accept friend request
                    const respondToFriendRequest = httpsCallable(
                        functions,
                        'respondToFriendRequest',
                    );
                    await respondToFriendRequest({
                        requestId: notificationData.data.requestId,
                        accept: true,
                    });
                } else if (notificationType === 'reset_requested') {
                    // Approve reset request
                    const respondToResetRequest = httpsCallable(functions, 'respondToResetRequest');
                    await respondToResetRequest({
                        gameId: notificationData.data.gameId,
                        approve: true,
                    });
                } else if (notificationType === 'undo_requested') {
                    // Approve undo request
                    const respondToUndoRequest = httpsCallable(functions, 'respondToUndoRequest');
                    await respondToUndoRequest({
                        gameId: notificationData.data.gameId,
                        approve: true,
                    });
                }

                decrementBadge();
            } catch (error) {
                console.error('Error accepting request:', error);
            }
        },
        [navigationRef, decrementBadge],
    );

    // Handle declining notifications
    const handleDecline = useCallback(
        async (notificationData) => {
            try {
                const notificationType = notificationData.data.type;

                if (notificationType === 'game_request') {
                    // Decline game request
                    const respondToGameInvite = httpsCallable(functions, 'respondToGameInvite');
                    await respondToGameInvite({
                        gameId: notificationData.data.gameId,
                        accept: false,
                    });
                } else if (notificationType === 'friend_request') {
                    // Decline friend request
                    const respondToFriendRequest = httpsCallable(
                        functions,
                        'respondToFriendRequest',
                    );
                    await respondToFriendRequest({
                        requestId: notificationData.data.requestId,
                        accept: false,
                    });
                } else if (notificationType === 'reset_requested') {
                    // Reject reset request
                    const respondToResetRequest = httpsCallable(functions, 'respondToResetRequest');
                    await respondToResetRequest({
                        gameId: notificationData.data.gameId,
                        approve: false,
                    });
                } else if (notificationType === 'undo_requested') {
                    // Reject undo request
                    const respondToUndoRequest = httpsCallable(functions, 'respondToUndoRequest');
                    await respondToUndoRequest({
                        gameId: notificationData.data.gameId,
                        approve: false,
                    });
                }

                decrementBadge();
            } catch (error) {
                console.error('Error declining request:', error);
            }
        },
        [decrementBadge],
    );

    // Handle notification tap
    const handleNotificationTap = useCallback(
        (notificationData) => {
            const notificationType = notificationData.data.type;

            // Navigate based on notification type
            if (navigationRef.current) {
                switch (notificationType) {
                    case 'move_made':
                    case 'game_accepted':
                    case 'reset_approved':
                    case 'reset_rejected':
                    case 'reset_cancelled':
                    case 'undo_approved':
                    case 'undo_rejected':
                    case 'undo_cancelled':
                    case 'undo_requested':
                    case 'reset_requested':
                        // Navigate to the game
                        if (notificationData.data.gameId) {
                            navigationRef.current.navigate('Game', {
                                gameId: notificationData.data.gameId,
                                isPvP: true,
                            });
                        }
                        break;

                    case 'friend_request':
                    case 'friend_accepted':
                        // Navigate to Friends screen
                        navigationRef.current.navigate('Friends');
                        break;

                    case 'game_request':
                        // Navigate to the game request (could also go to Friends, but game is more direct)
                        if (notificationData.data.gameId) {
                            navigationRef.current.navigate('Game', {
                                gameId: notificationData.data.gameId,
                                isPvP: true,
                            });
                        } else {
                            // Fallback to Friends if no gameId
                            navigationRef.current.navigate('Friends');
                        }
                        break;

                    case 'game_over':
                        // Could navigate to game history or results
                        if (notificationData.data.gameId) {
                            navigationRef.current.navigate('Game', {
                                gameId: notificationData.data.gameId,
                                isPvP: true,
                            });
                        }
                        break;

                    default:
                        break;
                }
            }

            decrementBadge();
        },
        [navigationRef, decrementBadge],
    );

    return {
        handleAccept,
        handleDecline,
        handleNotificationTap,
    };
};
