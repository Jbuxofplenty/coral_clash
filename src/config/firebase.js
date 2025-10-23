import { initializeApp } from 'firebase/app';
import {
    getAuth,
    initializeAuth,
    getReactNativePersistence,
    connectAuthEmulator,
} from 'firebase/auth';
import {
    getFirestore,
    connectFirestoreEmulator,
    doc,
    onSnapshot,
    getDoc,
    collection,
    query,
    where,
} from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Your web app's Firebase configuration
// Note: In Expo, use EXPO_PUBLIC_ prefix for environment variables accessible in client code
const firebaseConfig = {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
    databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL,
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with persistence for React Native
// Handle hot reload to avoid "already-initialized" error
let auth;
try {
    if (Platform.OS === 'web') {
        auth = getAuth(app);
    } else {
        auth = initializeAuth(app, {
            persistence: getReactNativePersistence(AsyncStorage),
        });
    }
} catch (error) {
    if (error.code === 'auth/already-initialized') {
        auth = getAuth(app);
    } else {
        throw error;
    }
}

// Initialize Firestore
const db = getFirestore(app);

// Initialize Functions
const functions = getFunctions(app);

// Connect to emulators in development
// Set EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true in .env to enable
const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

if (USE_EMULATOR) {
    const EMULATOR_HOST = Platform.OS === 'android' ? '10.0.2.2' : '127.0.0.1';

    // Connect to Auth Emulator (OAuth providers like Google won't work, use email/password)
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, {
        disableWarnings: true,
    });

    // Connect to Firestore Emulator
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);

    // Connect to Functions Emulator
    connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);
}

export { app, auth, db, functions, doc, onSnapshot, getDoc, collection, query, where };
