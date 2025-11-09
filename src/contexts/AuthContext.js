import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import {
    GoogleAuthProvider,
    OAuthProvider,
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

    // Configure Google Sign-In
    useEffect(() => {
        GoogleSignin.configure({
            webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
            iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
            offlineAccess: true,
        });
    }, []);

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
        try {
            setError(null);

            // Check if Google Play Services are available (Android only)
            if (Platform.OS === 'android') {
                await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            }

            // Sign in with Google
            const userInfo = await GoogleSignin.signIn();

            // Check if user cancelled (library returns { type: 'cancelled', data: null })
            if (!userInfo || userInfo.type === 'cancelled') {
                console.log('User cancelled Google Sign-In');
                return null;
            }

            // Get the ID token
            const idToken = userInfo.data?.idToken;

            if (!idToken) {
                throw new Error('No ID token received from Google Sign-In');
            }

            // Create Firebase credential
            const credential = GoogleAuthProvider.credential(idToken);

            // Sign in to Firebase
            const userCredential = await signInWithCredential(auth, credential);

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

            return userCredential.user;
        } catch (error) {
            // Check if user cancelled the sign-in flow
            // GoogleSignin errors can have different structures
            const errorCode = error.code || error.statusCode || error.toString();
            const isCancellation =
                errorCode === 'SIGN_IN_CANCELLED' ||
                errorCode === '-5' ||
                errorCode === 12501 || // Android cancellation code
                error.message?.includes('SIGN_IN_CANCELLED') ||
                error.message?.includes('cancelled') ||
                error.message?.includes('canceled');

            if (isCancellation) {
                console.log('User cancelled Google Sign-In');
                return null; // Don't show error for user cancellation
            }

            console.error('❌ signInWithGoogle error:', error);
            setError(error.message);
            throw error;
        }
    };

    const signInWithApple = async () => {
        try {
            setError(null);

            // Generate nonce for security
            const nonce = Math.random().toString(36).substring(2, 10);
            const hashedNonce = await Crypto.digestStringAsync(
                Crypto.CryptoDigestAlgorithm.SHA256,
                nonce,
            );

            // Request Apple authentication
            const appleCredential = await AppleAuthentication.signInAsync({
                requestedScopes: [
                    AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
                    AppleAuthentication.AppleAuthenticationScope.EMAIL,
                ],
                nonce: hashedNonce,
            });

            // Create Firebase credential
            const provider = new OAuthProvider('apple.com');
            const credential = provider.credential({
                idToken: appleCredential.identityToken,
                rawNonce: nonce,
            });

            // Sign in to Firebase
            const userCredential = await signInWithCredential(auth, credential);

            // Check if this is a new user and create Firestore document
            const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
            if (!userDoc.exists()) {
                // Apple may provide name only on first sign-in
                const displayName =
                    appleCredential.fullName?.givenName && appleCredential.fullName?.familyName
                        ? `${appleCredential.fullName.givenName} ${appleCredential.fullName.familyName}`
                        : userCredential.user.email?.split('@')[0] || 'Apple User';

                // Create the basic user document
                // The Firestore trigger will automatically add discriminator and default settings
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    displayName,
                    email: appleCredential.email || userCredential.user.email,
                    createdAt: new Date().toISOString(),
                    stats: {
                        gamesPlayed: 0,
                        gamesWon: 0,
                        gamesLost: 0,
                        gamesDraw: 0,
                    },
                    friends: [],
                });

                // Update Firebase Auth profile
                await updateProfile(userCredential.user, { displayName });

                // Wait for discriminator and settings to be assigned by Firestore trigger
                setTimeout(() => {
                    refreshUserData();
                }, 500);
            }

            return userCredential.user;
        } catch (error) {
            // Check if user cancelled the sign-in flow
            if (error.code === 'ERR_REQUEST_CANCELED') {
                console.log('User cancelled Apple Sign-In');
                return null; // Don't show error for user cancellation
            }

            console.error('❌ signInWithApple error:', error);
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
            // Sign out from Google if signed in (wrapped in try-catch to handle cases where GoogleSignin is not initialized)
            try {
                const isSignedIn = await GoogleSignin.isSignedIn();
                if (isSignedIn) {
                    await GoogleSignin.signOut();
                }
            } catch (googleSignOutError) {
                // Silently handle GoogleSignin errors (e.g., not configured, not initialized)
                console.log('Google Sign-Out skipped:', googleSignOutError.message);
            }
            // Sign out from Firebase
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
        signInWithApple,
        resetPassword,
        logOut,
        refreshUserData,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
