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
import { doc, setDoc, getDoc } from 'firebase/firestore';
import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';
import { httpsCallable } from 'firebase/functions';
import { auth, db, functions } from '../config/firebase';
import { getRandomAvatarKey } from '../constants/avatars';

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
        expoClientId: process.env.EXPO_PUBLIC_GOOGLE_EXPO_CLIENT_ID,
        iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
        androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Get additional user data from Firestore
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                const userData = userDoc.exists() ? userDoc.data() : {};

                setUser({
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    ...userData,
                });
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return unsubscribe;
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
                        // Pick a random avatar for the new user
                        const randomAvatar = getRandomAvatarKey();

                        await setDoc(doc(db, 'users', userCredential.user.uid), {
                            displayName: userCredential.user.displayName,
                            email: userCredential.user.email,
                            photoURL: userCredential.user.photoURL,
                            avatarKey: randomAvatar,
                            createdAt: new Date().toISOString(),
                            stats: {
                                gamesPlayed: 0,
                                gamesWon: 0,
                                gamesLost: 0,
                                gamesDraw: 0,
                            },
                            friends: [],
                        });

                        // Create default user settings
                        const updateUserSettings = httpsCallable(functions, 'updateUserSettings');
                        await updateUserSettings({
                            settings: {
                                theme: 'auto',
                                avatarKey: randomAvatar,
                            },
                        });
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

            // Pick a random avatar for the new user
            const randomAvatar = getRandomAvatarKey();

            // Create user document in Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                displayName,
                email,
                avatarKey: randomAvatar,
                createdAt: new Date().toISOString(),
                stats: {
                    gamesPlayed: 0,
                    gamesWon: 0,
                    gamesLost: 0,
                    gamesDraw: 0,
                },
                friends: [],
            });

            // Create default user settings (theme and avatar)
            const updateUserSettings = httpsCallable(functions, 'updateUserSettings');
            await updateUserSettings({
                settings: {
                    theme: 'auto',
                    avatarKey: randomAvatar,
                },
            });

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
            console.log('🚀 Starting Google Sign-In...');
            console.log('Request object ready:', !!request);
            setError(null);

            if (!request) {
                console.error('❌ OAuth request not ready');
                throw new Error('OAuth request not initialized');
            }

            console.log('📱 Opening Google Sign-In prompt...');
            const result = await promptAsync();
            console.log('📱 Prompt result:', result);
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

                setUser({
                    uid: currentUser.uid,
                    email: currentUser.email,
                    displayName: currentUser.displayName,
                    photoURL: currentUser.photoURL,
                    ...userData,
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
