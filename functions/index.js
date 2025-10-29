// Register ts-node to handle TypeScript imports
import './register.js';

// Initialize Firebase Admin before importing routes
import './init.js';

// Import route modules
import * as friends from './routes/friends.js';
import * as game from './routes/game.js';
import * as matchmaking from './routes/matchmaking.js';
import * as userProfile from './routes/userProfile.js';
import * as userSettings from './routes/userSettings.js';

// Import trigger modules
import { onGameMoveUpdate } from './triggers/onGameMoveUpdate.js';
import { onPlayerJoinQueue } from './triggers/onPlayerJoinQueue.js';
import { onUserCreate } from './triggers/onUserCreate.js';

// Import scheduled function modules
import { cleanupStaleMatchmakingEntries } from './scheduled/cleanupStaleMatchmakingEntries.js';

// ==================== User Profile APIs ====================
export const getPublicUserInfo = userProfile.getPublicUserInfo;
export const getUserProfile = userProfile.getUserProfile;
export const updateUserProfile = userProfile.updateUserProfile;

// ==================== User Settings APIs ====================
export const getUserSettings = userSettings.getUserSettings;
export const updateUserSettings = userSettings.updateUserSettings;
export const resetUserSettings = userSettings.resetUserSettings;

// ==================== Game APIs ====================
export const createGame = game.createGame;
export const createComputerGame = game.createComputerGame;
export const respondToGameInvite = game.respondToGameInvite;
export const makeMove = game.makeMove;
export const makeComputerMove = game.makeComputerMove;
export const resignGame = game.resignGame;
export const requestGameReset = game.requestGameReset;
export const respondToResetRequest = game.respondToResetRequest;
export const requestUndo = game.requestUndo;
export const respondToUndoRequest = game.respondToUndoRequest;
export const getActiveGames = game.getActiveGames;
export const getGameHistory = game.getGameHistory;
export const checkGameTime = game.checkGameTime;
export const handleTimeExpiration = game.handleTimeExpiration;

// ==================== Friends APIs ====================
export const sendFriendRequest = friends.sendFriendRequest;
export const respondToFriendRequest = friends.respondToFriendRequest;
export const getFriends = friends.getFriends;
export const removeFriend = friends.removeFriend;
export const searchUsers = friends.searchUsers;

// ==================== Matchmaking APIs ====================
export const joinMatchmaking = matchmaking.joinMatchmaking;
export const leaveMatchmaking = matchmaking.leaveMatchmaking;
export const updateMatchmakingHeartbeat = matchmaking.updateMatchmakingHeartbeat;
export const getMatchmakingStatus = matchmaking.getMatchmakingStatus;

// ==================== Firestore Triggers ====================
export { onGameMoveUpdate, onPlayerJoinQueue, onUserCreate };

// ==================== Scheduled Functions ====================
export { cleanupStaleMatchmakingEntries };
