# Firebase Setup Guide for Coral Clash

This guide will help you complete the Firebase setup for authentication, Firestore, and Cloud Functions.

## ✅ What's Already Done

1. **Firebase JS SDK Installed** (`firebase@^12.4.0`)
2. **AsyncStorage Installed** for auth persistence
3. **Firebase Config** set up with environment variables
4. **Auth Context** created for managing user authentication
5. **Login Component** updated with sign-in/sign-up UI
6. **Cloud Functions** structure created with API endpoints
7. **Firestore Rules** configured for security

## 🔧 Setup Steps

### 1. Environment Variables

The `.env` file has been created with your Firebase config. **Make sure to restart your Expo dev server** after creating the `.env` file:

```bash
# Stop the current server (Ctrl+C)
npm start
# or
yarn start
```

### 2. Install Firebase CLI

To deploy Cloud Functions, install the Firebase CLI globally:

```bash
npm install -g firebase-tools
```

Then log in to Firebase:

```bash
firebase login
```

### 3. Initialize Firebase in Your Project

```bash
cd functions
npm install
cd ..
```

### 4. Deploy Firestore Rules and Indexes

Deploy the security rules and indexes:

```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### 5. Deploy Cloud Functions

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

**Note:** Functions deployment requires the Blaze (pay-as-you-go) plan. The free tier is generous and includes:

- 2M invocations/month
- 400K GB-seconds/month
- 200K CPU-seconds/month

### 6. Enable Authentication in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project "coral-clash"
3. Go to **Authentication** → **Sign-in method**
4. Enable **Email/Password** authentication
5. (Optional) Enable **Google** sign-in if you want OAuth

### 7. Set Up Firestore Database

1. In Firebase Console, go to **Firestore Database**
2. Click **Create Database**
3. Start in **Production Mode** (we already have security rules)
4. Choose your location (e.g., `us-central1`)

## 📁 Project Structure

```
coral_clash/
├── src/
│   ├── config/
│   │   └── firebase.js           # Firebase initialization
│   ├── contexts/
│   │   └── AuthContext.js        # Auth state management
│   ├── hooks/
│   │   └── useFirebaseFunctions.js  # API calls wrapper
│   └── screens/
│       └── Login.js              # Auth UI
├── functions/
│   ├── index.js                  # Cloud Functions
│   └── package.json
├── firebase.json                 # Firebase config
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Database indexes
├── .env                         # Environment variables (DO NOT COMMIT)
└── .env.example                 # Template for .env
```

## 🔑 API Endpoints Available

### User Profile

- `getUserProfile(userId)` - Get user profile
- `updateUserProfile(profileData)` - Update profile

### User Settings

- `getUserSettings()` - Get user settings (theme preferences)
- `updateUserSettings(settings)` - Update user settings
- `resetUserSettings()` - Reset settings to defaults

### PvP Games

- `createPvPGame(opponentId, timeControl)` - Create new game
- `respondToGameInvite(gameId, accept)` - Accept/decline game
- `makeMove(gameId, move)` - Make a move
- `getActiveGames()` - Get all active games

### Friends

- `sendFriendRequest(friendId)` - Send friend request
- `respondToFriendRequest(requestId, accept)` - Accept/decline request
- `getFriends()` - Get friends list
- `removeFriend(friendId)` - Remove friend

## 💡 Usage Examples

### Authentication

```javascript
import { useAuth } from '../contexts/AuthContext';

function MyComponent() {
    const { user, signIn, signUp, logOut } = useAuth();

    // Sign up
    await signUp('email@example.com', 'password', 'Display Name');

    // Sign in
    await signIn('email@example.com', 'password');

    // Sign out
    await logOut();

    // Check if user is logged in
    if (user) {
        console.log('User ID:', user.uid);
    }
}
```

### Using Theme Settings

```javascript
import { useTheme } from '../contexts/ThemeContext';
import { useFirebaseFunctions } from '../hooks/useFirebaseFunctions';

function MyComponent() {
    const { isDarkMode, themePreference } = useTheme();
    const { updateUserSettings } = useFirebaseFunctions();

    // Use the theme
    const backgroundColor = isDarkMode ? '#000' : '#fff';

    // Update theme preference
    const handleThemeChange = async (newTheme) => {
        await updateUserSettings({ theme: newTheme });
        // Theme will automatically update via ThemeContext
    };
}
```

### Using Cloud Functions

```javascript
import { useFirebaseFunctions } from '../hooks/useFirebaseFunctions';

function GameScreen() {
    const { createPvPGame, getActiveGames, getUserSettings, updateUserSettings } =
        useFirebaseFunctions();

    // Create a new game
    const handleCreateGame = async (opponentId) => {
        const result = await createPvPGame(opponentId);
        console.log('Game created:', result.gameId);
    };

    // Get active games
    const loadGames = async () => {
        const result = await getActiveGames();
        console.log('Active games:', result.games);
    };

    // Update settings
    const handleUpdateTheme = async () => {
        await updateUserSettings({ theme: 'dark' });
    };
}
```

## 🔒 Security Notes

### About Firebase Config in Client Code

The Firebase API keys and config values in `.env` are **NOT traditional secrets**. They're designed to be public and embedded in your app. Security comes from:

1. **Firestore Security Rules** - Prevent unauthorized data access
2. **Firebase App Check** - Prevent abuse from unauthorized apps
3. **API Key Restrictions** - Limit usage to your app's domains/bundle IDs

However, using `.env` files is still best practice for:

- Managing multiple environments (dev/staging/prod)
- Easy configuration management
- Keeping them out of version control

### Restricting Your API Key

To prevent abuse, restrict your Firebase API key:

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project
3. Go to **APIs & Services** → **Credentials**
4. Click on your API key
5. Under **Application restrictions**, add:
    - iOS bundle ID: `com.yourdomain.coralclash`
    - Android package name: `com.yourdomain.coralclash`
    - Websites: `your-app-domain.com`

## 🧪 Testing Functions Locally

You can test Cloud Functions locally using the Firebase Emulator:

```bash
# Install emulators
firebase init emulators

# Start emulators
firebase emulators:start
```

Then update your `firebase.js` to use emulator in development:

```javascript
if (__DEV__) {
    connectFunctionsEmulator(functions, 'localhost', 5001);
}
```

## 📊 Firestore Data Structure

```
users/
  {userId}/
    - displayName: string
    - email: string
    - photoURL: string
    - createdAt: timestamp
    - stats: { gamesPlayed, gamesWon, gamesLost, gamesDraw }
    - friends/
        {friendId}/
          - addedAt: timestamp
    - settings/
        preferences/
          - theme: 'light' | 'dark' | 'auto'
          - updatedAt: timestamp

games/
  {gameId}/
    - creatorId: string
    - opponentId: string
    - status: 'pending' | 'active' | 'completed' | 'cancelled'
    - currentTurn: string (userId)
    - moves: array
    - gameState: object
    - createdAt: timestamp
    - updatedAt: timestamp

friendRequests/
  {requestId}/
    - from: string (userId)
    - to: string (userId)
    - status: 'pending' | 'accepted' | 'declined'
    - createdAt: timestamp

notifications/
  {notificationId}/
    - userId: string
    - type: 'game_invite' | 'move_made' | 'friend_request' | 'friend_request_accepted'
    - from: string (userId)
    - gameId: string (optional)
    - read: boolean
    - createdAt: timestamp
```

## 🚀 Next Steps

1. **Test Authentication**: Run your app and test sign-up/sign-in
2. **Deploy Functions**: Deploy your Cloud Functions to Firebase
3. **Implement Game Logic**: Integrate the PvP game functions with your game UI
4. **Add Push Notifications**: Set up Firebase Cloud Messaging for game notifications
5. **Add Social Features**: Implement friends list and game invitations in your UI

## 📚 Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Expo with Firebase Guide](https://docs.expo.dev/guides/using-firebase/)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions Documentation](https://firebase.google.com/docs/functions)
