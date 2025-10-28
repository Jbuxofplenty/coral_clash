# Coral Clash Architecture

## Overview

Coral Clash is a React Native mobile game with Firebase backend for multiplayer functionality.

## Project Structure

```
coral_clash/
├── src/                          # React Native mobile app
│   ├── assets/                   # Images, fonts, icons
│   ├── components/               # UI components
│   ├── constants/                # App constants
│   ├── contexts/                 # React contexts (Auth, Theme)
│   ├── hooks/                    # Custom hooks
│   │   ├── coralClash.ts        # ⭐ CORE GAME ENGINE
│   │   ├── useCoralClash.ts     # React hook for game
│   │   └── gameEnding.test.ts   # Game logic tests
│   ├── navigation/               # Navigation setup
│   ├── screens/                  # App screens
│   └── config/
│       └── firebase.js          # Firebase client config
│
├── shared/                       # 🔄 SHARED CODE (app + functions)
│   ├── game/
│   │   ├── coralClash.ts        # Re-exports core game engine
│   │   └── index.ts             # Public API
│   └── README.md                # Shared library docs
│
├── functions/                    # Firebase Cloud Functions
│   ├── routes/
│   │   ├── userProfile.js       # User profile APIs
│   │   ├── userSettings.js      # User settings APIs
│   │   ├── game.js              # ⭐ PvP/Computer game APIs (with validation)
│   │   └── friends.js          # Friends APIs
│   ├── utils/
│   │   ├── helpers.js          # Helper functions
│   │   └── gameValidator.js    # ⭐ Server-side move validation
│   └── index.js                # Functions entry point
│
├── firebase.json                # Firebase configuration
├── firestore.rules             # Security rules
└── firestore.indexes.json      # Database indexes
```

## Architecture Layers

### 1. **Mobile App (Client)**

**Technology**: React Native (Expo)

**Key Features**:

- Local game play vs AI
- PvP multiplayer
- User authentication
- Theme management (light/dark mode)
- Real-time game updates

**Key Files**:

- `src/hooks/coralClash.ts` - Core game engine
- `src/hooks/useCoralClash.ts` - React integration
- `src/screens/Game.js` - Game UI
- `src/screens/Login.js` - Authentication UI
- `src/screens/Settings.js` - User settings

### 2. **Shared Game Logic**

**Technology**: TypeScript

**Location**: `shared/game/`

**Purpose**: Single source of truth for game rules used by both client and server

**Key Features**:

- Complete Coral Clash rules
- Move generation and validation
- Win condition checking
- FEN/PGN support
- Coral mechanics

**Security Model**:

- Client uses for UI and move preview
- Server uses for authoritative validation

### 3. **Firebase Backend**

#### Cloud Functions

**Technology**: Node.js (JavaScript)

**Key APIs**:

**User Management**:

- `getUserProfile(userId)` - Get user profile
- `updateUserProfile(data)` - Update profile
- `getUserSettings()` - Get theme/settings
- `updateUserSettings(settings)` - Update settings
- `resetUserSettings()` - Reset to defaults

**PvP Games**:

- `createPvPGame(opponentId, timeControl)` - Create new game
- `respondToGameInvite(gameId, accept)` - Accept/decline invitation
- `makeMove(gameId, move)` - **Make move with server-side validation**
- `getActiveGames()` - Get user's active games

**Friends**:

- `sendFriendRequest(friendId)` - Send request
- `respondToFriendRequest(requestId, accept)` - Accept/decline
- `getFriends()` - Get friends list
- `removeFriend(friendId)` - Remove friend

**Security Features**:

- Server-side move validation (prevents cheating)
- Authentication required for all APIs
- Firestore security rules enforce data access

#### Firestore Database

**Collections**:

```
users/
  {userId}/
    - displayName, email, photoURL
    - stats: { gamesPlayed, gamesWon, gamesLost, gamesDraw }
    - settings/preferences/
        - theme: 'light' | 'dark' | 'auto'
    - friends/{friendId}/

games/
  {gameId}/
    - creatorId, opponentId
    - status: 'pending' | 'active' | 'completed' | 'cancelled'
    - currentTurn: userId
    - fen: current position
    - gameState: { board, coral, isCheck, etc. }
    - moves: [{ playerId, move, timestamp }]
    - result, winner (when completed)

friendRequests/
  {requestId}/
    - from, to
    - status: 'pending' | 'accepted' | 'declined'

notifications/
  {notificationId}/
    - userId, type, from
    - gameId (for game-related notifications)
    - read: boolean
```

## Data Flow

### PvP Game Flow

```
1. Player A creates game
   └─> createPvPGame(opponentId)
       └─> Firestore: games/{gameId} (status: 'pending')
       └─> Notification sent to Player B

2. Player B accepts
   └─> respondToGameInvite(gameId, true)
       └─> Firestore: games/{gameId} (status: 'active')

3. Player A makes move
   └─> makeMove(gameId, move)
       ├─> 🔒 Server validates move using game engine
       ├─> Firestore: games/{gameId} updated
       ├─> Notification sent to Player B
       └─> If game over: update player stats

4. Player B makes move
   └─> (repeat step 3)
```

### Move Validation Flow

```
Client                    Server (Functions)              Firestore
  │                              │                            │
  │  1. User makes move          │                            │
  ├──────────────────────────────>                            │
  │  makeMove(gameId, move)      │                            │
  │                              │                            │
  │                              │  2. Load game data         │
  │                              ├───────────────────────────>│
  │                              │                            │
  │                              │  3. Validate move          │
  │                              │  (using game engine)       │
  │                              │                            │
  │                              │  4. Save validated state   │
  │                              ├───────────────────────────>│
  │                              │                            │
  │  5. Return result            │                            │
  │<──────────────────────────────                            │
  │                              │                            │
  │  6. UI updates               │                            │
  │  (real-time listener)        │                            │
  │<──────────────────────────────────────────────────────────┤
```

## Security

### Authentication

- Firebase Auth with email/password
- JWT tokens for API authentication
- Persistent sessions with AsyncStorage

### Authorization

- Firestore security rules prevent unauthorized access
- Cloud Functions verify user permissions
- Server-side move validation prevents cheating

### Data Protection

- Users can only access their own data and friends' data
- Games only accessible by participants
- All writes go through Cloud Functions (except settings)

## Deployment

### Mobile App

```bash
# Development
npm start

# iOS Build
eas build --platform ios

# Android Build
eas build --platform android
```

### Cloud Functions

```bash
# Install dependencies
cd functions && npm install

# Deploy all
firebase deploy

# Deploy functions only
firebase deploy --only functions

# Deploy specific function
firebase deploy --only functions:makeMove
```

### Firestore Rules & Indexes

```bash
# Deploy rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

## Testing

### Game Logic Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Specific test file
npm test -- coralClash.test.ts
```

### Functions Testing

```bash
# Local emulator
cd functions
firebase emulators:start

# Run function tests
npm test
```

## Environment Variables

**Client** (`.env`):

```
EXPO_FIREBASE_API_KEY=...
EXPO_FIREBASE_AUTH_DOMAIN=...
EXPO_FIREBASE_PROJECT_ID=...
# etc.
```

**Server** (configured in Firebase Console):

- Automatic via Firebase Admin SDK

## Key Design Decisions

1. **Shared Game Logic**: Single source of truth prevents client-server inconsistencies
2. **Server-Side Validation**: All moves validated on server to prevent cheating
3. **Real-time Updates**: Firestore listeners provide instant game state updates
4. **TypeScript Game Engine**: Type safety ensures correctness
5. **Modular Functions**: Separated by domain for maintainability
6. **FEN Notation**: Standard chess notation adapted for Coral Clash

## Future Enhancements

- [ ] AI opponent using game engine
- [ ] Game replay system
- [ ] Spectator mode
- [ ] Tournament system
- [ ] Push notifications
- [ ] Social features (chat, achievements)
- [ ] Analytics and player statistics
