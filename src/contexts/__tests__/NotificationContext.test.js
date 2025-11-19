import * as Notifications from 'expo-notifications';
import React from 'react';

// Mock expo-device
jest.mock('expo-device', () => ({
    isDevice: true,
}));

// Mock expo-notifications
jest.mock('expo-notifications', () => ({
    setNotificationHandler: jest.fn(),
    addNotificationReceivedListener: jest.fn(() => ({
        remove: jest.fn(),
    })),
    addNotificationResponseReceivedListener: jest.fn(() => ({
        remove: jest.fn(),
    })),
    setBadgeCountAsync: jest.fn().mockResolvedValue(),
    getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
    getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'test-token' }),
    getDevicePushTokenAsync: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
    AndroidImportance: {
        MAX: 'max',
    },
}));

// Mock react-native more comprehensively
jest.mock('react-native', () => {
    return {
        Platform: {
            OS: 'ios',
            select: jest.fn((obj) => obj.ios),
        },
        AppState: {
            currentState: 'active',
            addEventListener: jest.fn(() => ({
                remove: jest.fn(),
            })),
        },
    };
});

// Mock Firebase
jest.mock('../../config/firebase', () => ({
    db: {},
}));

jest.mock('firebase/firestore', () => ({
    doc: jest.fn((db, collection, id) => ({ id, collection })),
    updateDoc: jest.fn().mockResolvedValue(),
}));

// Mock AuthContext
const mockUser = { uid: 'test-user-123' };
jest.mock('../AuthContext', () => ({
    AuthProvider: ({ children }) => children,
    useAuth: () => ({
        user: mockUser,
        loading: false,
    }),
}));

// Import after mocks
import { NotificationProvider } from '../NotificationContext';

// Test helpers
const ReactTestRenderer = require('react-test-renderer');
const { act } = ReactTestRenderer;

const getNotificationResponseCallback = (navigationRef) => {
    // Clear previous calls
    Notifications.addNotificationResponseReceivedListener.mockClear();

    // Render provider to register listeners
    const TestWrapper = ({ navigationRef: navRef, children }) => {
        return React.createElement(NotificationProvider, {
            navigationRef: navRef,
            children: children || React.createElement(React.Fragment),
        });
    };

    let callback = null;
    act(() => {
        ReactTestRenderer.create(
            React.createElement(TestWrapper, {
                navigationRef: navigationRef,
            }),
        );
    });

    // Extract the callback from the mock
    const mockCall = Notifications.addNotificationResponseReceivedListener.mock.calls[0];
    callback = mockCall ? mockCall[0] : null;
    
    return callback;
};

const invokeCallback = (callback, notificationResponse) => {
    act(() => {
        callback(notificationResponse);
    });
};

describe('NotificationContext - Notification Tap Navigation', () => {
    let mockNavigationRef;
    let responseListenerCallback;

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup navigation ref mock
        mockNavigationRef = {
            current: {
                navigate: jest.fn(),
            },
        };

        // Get the response listener callback
        responseListenerCallback = getNotificationResponseCallback(mockNavigationRef);
    });

    describe('Game-related notifications', () => {
        it('should navigate to Game screen when move_made notification is tapped', () => {
            const ReactTestRenderer = require('react-test-renderer');
            const { act } = ReactTestRenderer;
            
            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            data: {
                                type: 'move_made',
                                gameId: 'test-game-123',
                            },
                        },
                    },
                },
            };

            act(() => {
                invokeCallback(responseListenerCallback, notificationResponse);
            });

            expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Game', {
                gameId: 'test-game-123',
                isPvP: true,
            });
        });

        it('should navigate to Game screen when game_accepted notification is tapped', () => {
            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            data: {
                                type: 'game_accepted',
                                gameId: 'test-game-456',
                            },
                        },
                    },
                },
            };

            invokeCallback(responseListenerCallback, notificationResponse);

            expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Game', {
                gameId: 'test-game-456',
                isPvP: true,
            });
        });

        it('should navigate to Game screen when game_over notification is tapped', () => {
            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            data: {
                                type: 'game_over',
                                gameId: 'finished-game-123',
                            },
                        },
                    },
                },
            };

            invokeCallback(responseListenerCallback, notificationResponse);

            expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Game', {
                gameId: 'finished-game-123',
                isPvP: true,
            });
        });

        const undoResetTypes = [
            'undo_requested',
            'undo_approved',
            'undo_rejected',
            'undo_cancelled',
            'reset_requested',
            'reset_approved',
            'reset_rejected',
            'reset_cancelled',
        ];

        undoResetTypes.forEach((notificationType) => {
            it(`should navigate to Game screen when ${notificationType} notification is tapped`, () => {
                mockNavigationRef.current.navigate.mockClear();

                const notificationResponse = {
                    notification: {
                        request: {
                            content: {
                                data: {
                                    type: notificationType,
                                    gameId: `game-${notificationType}`,
                                },
                            },
                        },
                    },
                };

                invokeCallback(responseListenerCallback, notificationResponse);

                expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Game', {
                    gameId: `game-${notificationType}`,
                    isPvP: true,
                });
            });
        });
    });

    describe('Friend-related notifications', () => {
        it('should navigate to Friends screen when friend_request notification is tapped', () => {
            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            data: {
                                type: 'friend_request',
                                requestId: 'request-123',
                                from: 'user-456',
                            },
                        },
                    },
                },
            };

            invokeCallback(responseListenerCallback, notificationResponse);

            expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Friends');
        });

        it('should navigate to Friends screen when friend_accepted notification is tapped', () => {
            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            data: {
                                type: 'friend_accepted',
                                from: 'user-789',
                            },
                        },
                    },
                },
            };

            invokeCallback(responseListenerCallback, notificationResponse);

            expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Friends');
        });
    });

    describe('Game request notifications', () => {
        it('should navigate to Game screen when game_request notification is tapped with gameId', () => {
            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            data: {
                                type: 'game_request',
                                gameId: 'game-request-123',
                                from: 'user-456',
                            },
                        },
                    },
                },
            };

            invokeCallback(responseListenerCallback, notificationResponse);

            expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Game', {
                gameId: 'game-request-123',
                isPvP: true,
            });
        });

        it('should navigate to Friends screen when game_request notification is tapped without gameId', () => {
            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            data: {
                                type: 'game_request',
                                from: 'user-456',
                                // No gameId
                            },
                        },
                    },
                },
            };

            invokeCallback(responseListenerCallback, notificationResponse);

            expect(mockNavigationRef.current.navigate).toHaveBeenCalledWith('Friends');
        });
    });

    describe('Edge cases', () => {
        it('should not navigate when notification has no type', () => {
            mockNavigationRef.current.navigate.mockClear();

            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            data: {
                                // No type
                                gameId: 'test-game',
                            },
                        },
                    },
                },
            };

            invokeCallback(responseListenerCallback, notificationResponse);

            expect(mockNavigationRef.current.navigate).not.toHaveBeenCalled();
        });

        it('should not navigate when navigationRef is null', () => {
            const nullNavigationRef = { current: null };

            // Get callback with null ref
            const nullResponseCallback = getNotificationResponseCallback(nullNavigationRef);

            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            data: {
                                type: 'move_made',
                                gameId: 'test-game-123',
                            },
                        },
                    },
                },
            };

            expect(() => {
                invokeCallback(nullResponseCallback, notificationResponse);
            }).not.toThrow();

            expect(nullNavigationRef.current).toBeNull();
        });

        it('should not navigate when game notification has no gameId', () => {
            mockNavigationRef.current.navigate.mockClear();

            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            data: {
                                type: 'move_made',
                                // No gameId
                            },
                        },
                    },
                },
            };

            invokeCallback(responseListenerCallback, notificationResponse);

            expect(mockNavigationRef.current.navigate).not.toHaveBeenCalled();
        });

        it('should not navigate for unknown notification types', () => {
            mockNavigationRef.current.navigate.mockClear();

            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            data: {
                                type: 'unknown_notification_type',
                                gameId: 'test-game',
                            },
                        },
                    },
                },
            };

            invokeCallback(responseListenerCallback, notificationResponse);

            expect(mockNavigationRef.current.navigate).not.toHaveBeenCalled();
        });

        it('should handle notification response with missing data object gracefully', () => {
            mockNavigationRef.current.navigate.mockClear();

            const notificationResponse = {
                notification: {
                    request: {
                        content: {
                            // No data property
                        },
                    },
                },
            };

            expect(() => {
                invokeCallback(responseListenerCallback, notificationResponse);
            }).not.toThrow();

            expect(mockNavigationRef.current.navigate).not.toHaveBeenCalled();
        });
    });
});
