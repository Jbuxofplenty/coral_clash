import React, { createContext, useState, useEffect, useContext } from 'react';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithCredential,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    signOut,
    onAuthStateChanged,
    updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
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

    const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
        expoClientId: process.env.EXPO_GOOGLE_EXPO_CLIENT_ID,
        iosClientId: process.env.EXPO_GOOGLE_IOS_CLIENT_ID,
        androidClientId: process.env.EXPO_GOOGLE_ANDROID_CLIENT_ID,
        webClientId: process.env.EXPO_GOOGLE_WEB_CLIENT_ID,
    });

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
        if (response?.type === 'success') {
            const { id_token } = response.params;
            const credential = GoogleAuthProvider.credential(id_token);
            signInWithCredential(auth, credential)
                .then(async (userCredential) => {
                    // Check if this is a new user and create Firestore document
                    const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
                    if (!userDoc.exists()) {
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

                        // Wait for discriminator and settings to be assigned by Firestore trigger
                        setTimeout(() => {
                            refreshUserData();
                        }, 500);
                    }
                })
                .catch((error) => {
                    console.error('Google Sign-In Error:', error.message);
                    setError(error.message);
                });
        } else if (response?.type === 'error') {
            setError(response.error?.message || 'Google sign-in failed');
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
        if (!googleSignInAvailable) {
            const error =
                'Google Sign-In is only available in production builds. Use email/password sign-in for development.';
            setError(error);
            throw new Error(error);
        }

        try {
            setError(null);

            if (!request) {
                console.error('❌ OAuth request not ready');
                throw new Error('OAuth request not initialized');
            }
            await promptAsync();
        } catch (error) {
            console.error('❌ signInWithGoogle error:', error);
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
