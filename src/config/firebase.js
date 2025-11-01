import AsyncStorage from '@react-native-async-storage/async-storage';
import { initializeApp } from 'firebase/app';
import { CustomProvider, initializeAppCheck } from 'firebase/app-check';
import {
    connectAuthEmulator,
    getAuth,
    getReactNativePersistence,
    initializeAuth,
} from 'firebase/auth';
import {
    collection,
    connectFirestoreEmulator,
    doc,
    getDoc,
    getFirestore,
    onSnapshot,
    query,
    where,
} from 'firebase/firestore';
import { connectFunctionsEmulator, getFunctions } from 'firebase/functions';
import { Platform, Alert } from 'react-native';

// 🔍 DEBUG: Log app startup (this runs when module is imported)
console.log('🚀 [Firebase Config] Module loading...');
console.log('🔍 [Firebase Config] Platform:', Platform.OS);
console.log('🔍 [Firebase Config] __DEV__:', __DEV__);

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

// 🔍 DEBUG: Log environment variable availability
console.log('🔍 [Firebase Config] Environment variables check:');
console.log(
    '  - FIREBASE_API_KEY:',
    process.env.EXPO_PUBLIC_FIREBASE_API_KEY ? '✅ Set' : '❌ UNDEFINED',
);
console.log(
    '  - FIREBASE_PROJECT_ID:',
    process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ UNDEFINED',
);
console.log(
    '  - FIREBASE_APP_ID:',
    process.env.EXPO_PUBLIC_FIREBASE_APP_ID ? '✅ Set' : '❌ UNDEFINED',
);
console.log('  - USE_FIREBASE_EMULATOR:', process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR);

// 🔍 DEBUG: Validate config before initialization
const missingKeys = Object.entries(firebaseConfig)
    .filter(([_key, value]) => !value)
    .map(([key]) => key);

if (missingKeys.length > 0) {
    const errorMsg = `🔥 FIREBASE CONFIG ERROR: Missing required environment variables: ${missingKeys.join(', ')}. Check that .env file was created during build with EXPO_PUBLIC_* variables.`;

    console.error('❌ [Firebase Config]', errorMsg);
    console.error('❌ [Firebase Config] Platform:', Platform.OS);
    console.error('❌ [Firebase Config] Config state:', {
        apiKey: !!firebaseConfig.apiKey ? 'set' : 'MISSING',
        projectId: !!firebaseConfig.projectId ? 'set' : 'MISSING',
        appId: !!firebaseConfig.appId ? 'set' : 'MISSING',
    });

    // Show alert in dev mode
    if (__DEV__) {
        Alert.alert('Firebase Config Error', errorMsg);
    }

    // Throw error with clear message that will show up in crash reports
    throw new Error(errorMsg);
} else {
    console.log('✅ [Firebase Config] All required config values present');
}

// Initialize Firebase
console.log('🔄 [Firebase Config] Initializing Firebase app...');
let app;
try {
    app = initializeApp(firebaseConfig);
    console.log('✅ [Firebase Config] Firebase app initialized successfully');
    console.log('✅ [Firebase Config] Project ID:', firebaseConfig.projectId);
} catch (error) {
    console.error('❌ [Firebase Config] FIREBASE INITIALIZATION FAILED:', error);
    console.error('❌ [Firebase Config] Error code:', error.code);
    console.error('❌ [Firebase Config] Error message:', error.message);

    // Re-throw with more context
    throw new Error(`Firebase initialization failed (${error.code}): ${error.message}`);
}

// Set EXPO_PUBLIC_USE_FIREBASE_EMULATOR=true in .env to enable
// Set EXPO_PUBLIC_EMULATOR_HOST to your computer's local IP (e.g., 192.168.x.x) for physical devices
const USE_EMULATOR = process.env.EXPO_PUBLIC_USE_FIREBASE_EMULATOR === 'true';

// Initialize App Check
// For React Native, we use a custom provider with debug tokens in development
// In production, this will use device attestation (DeviceCheck for iOS, Play Integrity for Android)

// Only enable App Check when using emulators (where it works without crypto issues)
// When connecting to real Firebase, skip App Check due to React Native crypto limitations
if (USE_EMULATOR && __DEV__) {
    // Development with emulators: Use debug token
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    try {
        initializeAppCheck(app, {
            provider: new CustomProvider({
                getToken: () =>
                    Promise.resolve({
                        token: 'debug-token',
                        expireTimeMillis: Date.now() + 60 * 60 * 1000,
                    }),
            }),
            isTokenAutoRefreshEnabled: true,
        });
    } catch (error) {
        console.warn('App Check initialization failed:', error);
    }
} else {
    // Real Firebase or production: Skip App Check to avoid crypto errors in React Native
    // Re-enable when proper device attestation is configured
    console.log('App Check: Disabled (connecting to real Firebase)');
}

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
if (USE_EMULATOR) {
    // Determine the emulator host dynamically:
    // - Android emulator always uses 10.0.2.2 (special alias for host machine)
    // - iOS (simulator and physical devices) can use your Mac's local IP
    //   The Mac's local IP works for BOTH iOS Simulator and physical iPhone on same WiFi
    // - Set EXPO_PUBLIC_EMULATOR_HOST to override (useful if IP changes or for localhost)
    let EMULATOR_HOST;

    if (Platform.OS === 'android') {
        // Android emulator uses special IP that maps to host's localhost
        EMULATOR_HOST = process.env.EXPO_PUBLIC_EMULATOR_HOST || '10.0.2.2';
    } else {
        // iOS: Use Mac's local IP (works for both simulator and physical devices)
        // Fallback to localhost if not set
        EMULATOR_HOST = process.env.EXPO_PUBLIC_EMULATOR_HOST || '127.0.0.1';
    }

    // Connect to Auth Emulator (OAuth providers like Google won't work, use email/password)
    connectAuthEmulator(auth, `http://${EMULATOR_HOST}:9099`, {
        disableWarnings: true,
    });

    // Connect to Firestore Emulator
    connectFirestoreEmulator(db, EMULATOR_HOST, 8080);

    // Connect to Functions Emulator
    connectFunctionsEmulator(functions, EMULATOR_HOST, 5001);

    console.log(`🔧 Connected to Firebase Emulators at ${EMULATOR_HOST}`);
}

export { app, auth, collection, db, doc, functions, getDoc, onSnapshot, query, where };
