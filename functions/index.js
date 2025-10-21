// Register ts-node to handle TypeScript imports
require('./register');

const admin = require('firebase-admin');

// Initialize Firebase Admin
admin.initializeApp();

// Import route modules
const userProfile = require('./routes/userProfile');
const userSettings = require('./routes/userSettings');
const pvpGame = require('./routes/pvpGame');
const friends = require('./routes/friends');

// ==================== User Profile APIs ====================
exports.getUserProfile = userProfile.getUserProfile;
exports.updateUserProfile = userProfile.updateUserProfile;

// ==================== User Settings APIs ====================
exports.getUserSettings = userSettings.getUserSettings;
exports.updateUserSettings = userSettings.updateUserSettings;
exports.resetUserSettings = userSettings.resetUserSettings;

// ==================== PvP Game APIs ====================
exports.createPvPGame = pvpGame.createPvPGame;
exports.respondToGameInvite = pvpGame.respondToGameInvite;
exports.makeMove = pvpGame.makeMove;
exports.getActiveGames = pvpGame.getActiveGames;

// ==================== Friends APIs ====================
exports.sendFriendRequest = friends.sendFriendRequest;
exports.respondToFriendRequest = friends.respondToFriendRequest;
exports.getFriends = friends.getFriends;
exports.removeFriend = friends.removeFriend;
