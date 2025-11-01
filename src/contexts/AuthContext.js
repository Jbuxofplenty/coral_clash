import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import * as WebBrowser from 'expo-web-browser';
import {
    GoogleAuthProvider,
    createUserWithEmailAndPassword,
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithCredential,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
} from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { auth, db } from '../config/firebase';

// Required for Google Sign-In on web
WebBrowser.maybeCompleteAuthSession();

const AuthContext = createContext({});

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Google Sign-In configuration
    // Only available in production builds, not Expo Go
    const isExpoGo = Constants.executionEnvironment === 'storeClient';
    const googleSignInAvailable = !isExpoGo;

    // Debug: Log OAuth configuration
    console.log('🔑 Google OAuth Configuration:', {
        isExpoGo,
        googleSignInAvailable,
        expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID?.substring(0, 20) + '...',
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.substring(0, 20) + '...',
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID?.substring(0, 20) + '...',
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID?.substring(0, 20) + '...',
    });

    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        // Use the reversed iOS client ID as the redirect URI (native iOS OAuth flow)
        redirectUri: Platform.OS === 'ios' 
            ? `com.googleusercontent.apps.${process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID?.split('-')[0]}:/oauth2redirect`
            : undefined,
    });

    // Debug: Log OAuth request initialization
    console.log('🔑 OAuth request initialized:', { requestReady: !!request });

    useEffect(() => {
        let userDataUnsubscribe = null;
        let settingsUnsubscribe = null;

        const authUnsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
            if (firebaseUser) {
                let cachedUserData = {};
                let cachedSettings = null;

                // Helper function to update user state with latest data
                const updateUserState = () => {
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email,
                        displayName: firebaseUser.displayName,
                        photoURL: firebaseUser.photoURL,
                        ...cachedUserData,
                        settings: cachedSettings, // Add settings to user object
                    });
                    setLoading(false);
                };

                // Set up real-time listener for user data
                // This will automatically update when discriminator is added
                userDataUnsubscribe = onSnapshot(
                    doc(db, 'users', firebaseUser.uid),
                    (userDoc) => {
                        cachedUserData = userDoc.exists() ? userDoc.data() : {};
                        updateUserState();
                    },
                    (error) => {
                        console.error('Error listening to user data:', error);
                        setLoading(false);
                    },
                );

                // Set up real-time listener for user settings
                // This will automatically update when settings change (like avatar)
                settingsUnsubscribe = onSnapshot(
                    doc(db, 'users', firebaseUser.uid, 'settings', 'preferences'),
                    (settingsDoc) => {
                        cachedSettings = settingsDoc.exists() ? settingsDoc.data() : null;
                        updateUserState();
                    },
                    (error) => {
                        console.error('Error listening to user settings:', error);
                    },
                );
            } else {
                setUser(null);
                setLoading(false);
                // Clean up listeners if they exist
                if (userDataUnsubscribe) {
                    userDataUnsubscribe();
                    userDataUnsubscribe = null;
                }
                if (settingsUnsubscribe) {
                    settingsUnsubscribe();
                    settingsUnsubscribe = null;
                }
            }
        });

        return () => {
            authUnsubscribe();
            if (userDataUnsubscribe) {
                userDataUnsubscribe();
            }
            if (settingsUnsubscribe) {
                settingsUnsubscribe();
            }
        };
    }, []);

    // Handle Google Sign-In response
    useEffect(() => {
        console.log('🔑 OAuth response received:', {
            type: response?.type,
            hasParams: !!response?.params,
            hasIdToken: !!response?.params?.id_token,
            error: response?.error,
        });

        if (response?.type === 'success') {
            console.log('✅ OAuth success! Exchanging token with Firebase...');
            const { id_token } = response.params;
            const credential = GoogleAuthProvider.credential(id_token);
            signInWithCredential(auth, credential)
                .then(async (userCredential) => {
                    console.log('✅ Firebase credential exchange successful:', {
                        uid: userCredential.user.uid,
                        email: userCredential.user.email,
                    });

                    // Check if this is a new user and create Firestore document
                    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
                    if (!userDoc.exists()) {
                        console.log('📝 New user - creating Firestore document...');
                        // Create the basic user document
                        // The Firestore trigger will automatically add discriminator and default settings
                        await setDoc(doc(db, 'users', userCredential.user.uid), {
                            displayName: userCredential.user.displayName,
                            email: userCredential.user.email,
                            photoURL: userCredential.user.photoURL,
                            createdAt: new Date().toISOString(),
                            stats: {
                                gamesPlayed: 0,
                                gamesWon: 0,
                                gamesLost: 0,
                                gamesDraw: 0,
                            },
                            friends: [],
                        });

                        console.log('✅ Firestore document created, waiting for trigger...');
                        // Wait for discriminator and settings to be assigned by Firestore trigger
                        setTimeout(() => {
                            refreshUserData();
                        }, 500);
                    } else {
                        console.log('✅ Existing user signed in');
                    }
                })
                .catch((error) => {
                    console.error('❌ Firebase credential exchange failed:', {
                        code: error.code,
                        message: error.message,
                        fullError: error,
                    });
                    setError(error.message);
                });
        } else if (response?.type === 'error') {
            console.error('❌ OAuth error:', {
                type: response.type,
                error: response.error,
                errorCode: response.error?.code,
            });
            setError(response.error?.message || 'Google sign-in failed');
        } else if (response?.type === 'cancel') {
            console.log('🚫 User cancelled OAuth flow');
        } else if (response?.type === 'dismiss') {
            console.log('🚫 User dismissed OAuth flow');
        }
    }, [response]);

    const signUp = async (email, password, displayName) => {
        try {
            setError(null);
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);

            // Update profile with display name
            await updateProfile(userCredential.user, { displayName });

            // Create the basic user document
            // The Firestore trigger will automatically add discriminator and default settings
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                displayName,
                email,
                createdAt: new Date().toISOString(),
                stats: {
                    gamesPlayed: 0,
                    gamesWon: 0,
                    gamesLost: 0,
                    gamesDraw: 0,
                },
                friends: [],
            });

            // Wait a moment for the Firestore trigger to assign discriminator and settings
            // Then refresh user data to get the discriminator and settings
            setTimeout(() => {
                refreshUserData();
            }, 500);

            return userCredential.user;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const signIn = async (email, password) => {
        try {
            setError(null);
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            return userCredential.user;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const signInWithGoogle = async () => {
        console.log('🔑 signInWithGoogle called');
        console.log('🔑 Google Sign-In available:', googleSignInAvailable);
        console.log('🔑 OAuth request ready:', !!request);

        if (!googleSignInAvailable) {
            const error =
                'Google Sign-In is only available in production builds. Use email/password sign-in for development.';
            console.error('❌ Google Sign-In not available:', error);
            setError(error);
            throw new Error(error);
        }

        try {
            setError(null);

            if (!request) {
                console.error('❌ OAuth request not ready');
                throw new Error('OAuth request not initialized');
            }

            console.log('🔑 Prompting user for OAuth authentication...');
            const result = await promptAsync();
            console.log('🔑 promptAsync result:', {
                type: result?.type,
                hasParams: !!result?.params,
            });

            return result;
        } catch (error) {
            console.error('❌ signInWithGoogle error:', {
                message: error.message,
                code: error.code,
                fullError: error,
            });
            setError(error.message);
            throw error;
        }
    };

    const resetPassword = async (email) => {
        try {
            setError(null);
            await sendPasswordResetEmail(auth, email);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const logOut = async () => {
        try {
            setError(null);
            await signOut(auth);
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const refreshUserData = async () => {
        try {
            const currentUser = auth.currentUser;
            if (currentUser) {
                // Reload user data from Firestore
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                const userData = userDoc.exists() ? userDoc.data() : {};

                // Also reload user settings from subcollection
                const settingsDoc = await getDoc(
                    doc(db, 'users', currentUser.uid, 'settings', 'preferences'),
                );
                const settings = settingsDoc.exists() ? settingsDoc.data() : null;

                setUser({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    ...userData,
                    settings, // Add settings to user object
                });
            }
        } catch (err) {
            console.error('Error refreshing user data:', err);
        }
    };

    const value = {
        user,
        loading,
        error,
        signUp,
        signIn,
        signInWithGoogle,
        googleSignInAvailable,
        resetPassword,
        logOut,
        refreshUserData,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
