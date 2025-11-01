import { GoogleSignin } from '@react-native-google-signin/google-signin';
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
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

            // Sign in with Google
            const userInfo = await GoogleSignin.signIn();

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
            // Sign out from Google if signed in
            const isSignedIn = await GoogleSignin.isSignedIn();
            if (isSignedIn) {
                await GoogleSignin.signOut();
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
        resetPassword,
        logOut,
        refreshUserData,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
