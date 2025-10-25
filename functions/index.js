// Register ts-node to handle TypeScript imports
require('./register');

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Import route modules
const userProfile = require('./routes/userProfile');
const userSettings = require('./routes/userSettings');
const game = require('./routes/game');
const friends = require('./routes/friends');
const matchmaking = require('./routes/matchmaking');

// Import trigger modules
const { onUserCreate } = require('./triggers/onUserCreate');
const { onPlayerJoinQueue } = require('./triggers/onPlayerJoinQueue');
const { onGameMoveUpdate } = require('./triggers/onGameMoveUpdate');

// Import scheduled function modules
const { cleanupStaleMatchmakingEntries } = require('./scheduled/cleanupStaleMatchmakingEntries');

// ==================== User Profile APIs ====================
exports.getPublicUserInfo = userProfile.getPublicUserInfo;
exports.getUserProfile = userProfile.getUserProfile;
exports.updateUserProfile = userProfile.updateUserProfile;

// ==================== User Settings APIs ====================
exports.getUserSettings = userSettings.getUserSettings;
exports.updateUserSettings = userSettings.updateUserSettings;
exports.resetUserSettings = userSettings.resetUserSettings;

// ==================== Game APIs ====================
exports.createGame = game.createGame;
exports.createComputerGame = game.createComputerGame;
exports.respondToGameInvite = game.respondToGameInvite;
exports.makeMove = game.makeMove;
exports.makeComputerMove = game.makeComputerMove;
exports.resignGame = game.resignGame;
exports.requestGameReset = game.requestGameReset;
exports.respondToResetRequest = game.respondToResetRequest;
exports.requestUndo = game.requestUndo;
exports.respondToUndoRequest = game.respondToUndoRequest;
exports.getActiveGames = game.getActiveGames;
exports.getGameHistory = game.getGameHistory;
exports.checkGameTime = game.checkGameTime;
exports.handleTimeExpiration = game.handleTimeExpiration;

// ==================== Friends APIs ====================
exports.sendFriendRequest = friends.sendFriendRequest;
exports.respondToFriendRequest = friends.respondToFriendRequest;
exports.getFriends = friends.getFriends;
exports.removeFriend = friends.removeFriend;
exports.searchUsers = friends.searchUsers;

// ==================== Matchmaking APIs ====================
exports.joinMatchmaking = matchmaking.joinMatchmaking;
exports.leaveMatchmaking = matchmaking.leaveMatchmaking;
exports.updateMatchmakingHeartbeat = matchmaking.updateMatchmakingHeartbeat;
exports.getMatchmakingStatus = matchmaking.getMatchmakingStatus;

// ==================== Firestore Triggers ====================
exports.onPlayerJoinQueue = onPlayerJoinQueue;
exports.onGameMoveUpdate = onGameMoveUpdate;
exports.onUserCreate = onUserCreate;

// ==================== Scheduled Functions ====================
exports.cleanupStaleMatchmakingEntries = cleanupStaleMatchmakingEntries;
