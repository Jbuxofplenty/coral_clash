# Account Deletion Feature

## Overview

The account deletion feature allows users to permanently delete their Coral Clash accounts, complying with Apple App Store Guideline 5.1.1(v). When an account is deleted:

- All personal data is immediately removed
- Firebase Authentication account is deleted
- Games are preserved but the user appears as "Anonymous"
- Friends and social connections are removed
- Active games are forfeited
- Pending game invites are cancelled

## User Flow

### 1. Initial Request
User navigates to Settings → Danger Zone → "Delete Account" button

### 2. First Confirmation
A dialog explains the consequences:
- Account deletion is permanent
- Personal data will be removed
- Games will continue with user appearing as "Anonymous"
- Friends and friend requests will be removed
- Active games will be forfeited
- Cannot be undone

### 3. Second Confirmation
User must type "DELETE" (all caps) to confirm deletion

### 4. Account Deletion
Backend processes the deletion:
1. Anonymizes game data
2. Cancels pending games
3. Forfeits active games
4. Updates opponent stats
5. Removes friend connections
6. Deletes friend requests
7. Deletes notifications
8. Removes from matchmaking queue
9. Deletes user settings
10. Deletes user profile
11. Deletes Firebase Auth account

### 5. Completion
- Success message is displayed
- User is logged out
- Redirected to Login screen

## Implementation Details

### Backend API

**Endpoint:** `deleteAccount`  
**Type:** Firebase Cloud Function (callable)  
**Authentication:** Required  
**File:** `functions/routes/userProfile.js`

#### Data Processing Steps

##### 1. Game Anonymization
```javascript
// For all games where user is creator:
{
  creatorDisplayName: "Anonymous",
  creatorAvatarKey: "dolphin"
}

// For all games where user is opponent:
{
  opponentDisplayName: "Anonymous",
  opponentAvatarKey: "dolphin"
}
```

##### 2. Pending Games
```javascript
// Status: pending → cancelled
{
  status: "cancelled",
  cancelReason: "account_deleted"
}
```

##### 3. Active Games
```javascript
// Status: active → completed
{
  status: "completed",
  result: "forfeit",
  winner: <opponent_id>,
  completedAt: <timestamp>
}

// Opponent stats updated:
{
  "stats.gamesWon": <current + 1>,
  "stats.gamesPlayed": <current + 1>
}
```

##### 4. Friends Cleanup
- Delete `users/{userId}/friends/*` (user's friend list)
- Delete `users/{friendId}/friends/{userId}` (remove user from all friends' lists)

##### 5. Friend Requests Cleanup
- Delete all requests where `from == userId`
- Delete all requests where `to == userId`

##### 6. Notifications Cleanup
- Delete all notifications where `userId == userId`
- Delete all notifications where `from == userId`

##### 7. Matchmaking Queue
- Remove `matchmakingQueue/{userId}` if exists

##### 8. User Data
- Delete `users/{userId}/settings/*`
- Delete `users/{userId}`

##### 9. Authentication
- Call `admin.auth().deleteUser(userId)`

#### Response Format

**Success:**
```javascript
{
  success: true,
  message: "Account deleted successfully"
}
```

**Error:**
```javascript
{
  code: "internal",
  message: "Failed to delete account: <error_details>"
}
```

### Frontend Implementation

#### Hook: `useFirebaseFunctions`

**Function:** `deleteAccount()`  
**Returns:** Promise resolving to response data  
**File:** `src/hooks/useFirebaseFunctions.js`

```javascript
const { deleteAccount } = useFirebaseFunctions();

try {
  const result = await deleteAccount();
  console.log(result.message); // "Account deleted successfully"
} catch (error) {
  console.error('Deletion failed:', error);
}
```

#### UI Component: Settings Screen

**File:** `src/screens/Settings.js`

**Components:**
- Danger Zone section with red styling
- Warning text about permanence
- Delete Account button
- Two-step confirmation flow
- Loading state during deletion
- Error handling with retry option

**States:**
- `deleting`: Boolean indicating deletion in progress
- Disables all buttons during deletion

**Confirmation Flow:**
1. `handleDeleteAccount()` - Shows first alert
2. `showDeleteConfirmation()` - Alert.prompt for typing "DELETE"
3. `performAccountDeletion()` - Executes deletion
4. Success: logs out and navigates to Login
5. Error: shows retry dialog

## Data Retention Policy

### What Gets Deleted
- User profile document
- User settings
- Friends subcollection
- Friend requests (sent and received)
- Notifications (sent and received)
- Matchmaking queue entries
- Firebase Authentication account
- Email address
- Display name (from profile)
- Photos/avatars (references)

### What Gets Preserved (Anonymized)
- Game records (for opponent's history)
- Game moves and history
- Win/loss records (anonymized)

**Why preserve games?**
- Maintains integrity of opponent's game history
- Preserves win/loss statistics for other players
- Keeps game records for historical purposes
- User appears as "Anonymous" with default "dolphin" avatar

## Security Considerations

### Authorization
- User must be authenticated to delete account
- Can only delete their own account
- No admin override (prevents accidental deletion)

### Confirmation Requirements
- Two-step confirmation process
- Must type "DELETE" exactly (case-sensitive)
- Clear warnings about consequences
- No grace period (immediate deletion)

### Data Cleanup
- Uses Firestore batched writes for atomicity
- Handles large datasets (500 operations per batch)
- Comprehensive error handling
- Logs all operations for debugging

### Firestore Security Rules
No changes required - Cloud Function uses Admin SDK which bypasses security rules

## Testing

### Test File
`functions/__tests__/userProfile.test.js`

### Test Coverage
- ✅ Account deletion with no games or friends
- ✅ Anonymize games where user is creator
- ✅ Anonymize games where user is opponent
- ✅ Cancel pending games
- ✅ Forfeit active games
- ✅ Update opponent stats on forfeit
- ✅ Remove friends from both sides
- ✅ Delete friend requests (sent and received)
- ✅ Delete notifications (sent and received)
- ✅ Remove from matchmaking queue
- ✅ Delete user settings
- ✅ Delete user profile
- ✅ Delete Firebase Auth account
- ✅ Handle errors during deletion
- ✅ Require authentication

### Manual Testing Checklist

#### Pre-deletion State
- [ ] Create test account
- [ ] Add friends
- [ ] Send/receive friend requests
- [ ] Create pending game invite
- [ ] Start active game
- [ ] Join matchmaking queue
- [ ] Change settings (avatar, theme)

#### Deletion Flow
- [ ] Navigate to Settings
- [ ] Scroll to Danger Zone
- [ ] Tap "Delete Account"
- [ ] Verify first confirmation dialog
- [ ] Tap "Continue"
- [ ] Verify second confirmation prompt
- [ ] Type incorrect text → Should show error
- [ ] Type "DELETE" correctly
- [ ] Verify deletion in progress state
- [ ] Verify success message
- [ ] Verify logout
- [ ] Verify redirect to Login

#### Post-deletion Verification
- [ ] Cannot log in with deleted credentials
- [ ] Friends no longer see user in friend list
- [ ] Pending game invites are cancelled
- [ ] Active games show "Anonymous" as player
- [ ] Opponent received win from forfeit
- [ ] User profile document deleted from Firestore
- [ ] User settings deleted from Firestore
- [ ] Friend requests deleted from Firestore
- [ ] Notifications deleted from Firestore
- [ ] Matchmaking queue entry removed
- [ ] Firebase Auth account deleted

#### Error Handling
- [ ] Test with network offline → Shows error
- [ ] Retry functionality works
- [ ] Cancel option works

## Troubleshooting

### Common Issues

#### "Failed to delete account: Database error"
**Cause:** Firestore query or batch write failed  
**Solution:** Check Firebase console logs for details, retry deletion

#### Deletion hangs/times out
**Cause:** Large amount of data to process  
**Solution:** Backend uses batched writes to handle any size, but may take time for users with many games

#### User still appears in friends list
**Cause:** Friend deletion batch may have failed  
**Solution:** Backend cleans up both sides of friendship, but check logs for errors

#### Games not showing as forfeited
**Cause:** Game update batch may have failed  
**Solution:** Backend handles games in batches, verify opponent's game shows correct status

### Monitoring

Check Firebase Functions logs:
```bash
firebase functions:log --only deleteAccount
```

Key log messages:
- `Starting account deletion for user: {userId}`
- `Step 1: Anonymizing games...`
- `Step 2: Removing friends...`
- `Step 3: Deleting friend requests...`
- `Step 4: Deleting notifications...`
- `Step 5: Removing from matchmaking queue...`
- `Step 6: Deleting user settings...`
- `Step 7: Deleting user profile...`
- `Step 8: Deleting Firebase Auth account...`
- `Account deletion completed successfully for user: {userId}`

## Compliance

### Apple App Store Guideline 5.1.1(v)
✅ **Requirement:** Apps that support account creation must offer account deletion

**Our Implementation:**
- Prominent "Delete Account" button in Settings
- Clear explanation of consequences
- Immediate deletion (no waiting period)
- Comprehensive data removal
- User-initiated process

### GDPR Compliance
✅ **Right to Erasure (Article 17)**
- Users can delete their account and personal data
- Data is permanently removed from all systems
- Game history is anonymized (legitimate interest for other users)
- No personal identifiers remain after deletion

## API Reference

### Cloud Function

```typescript
/**
 * Delete user account
 * Permanently deletes user account and all associated data
 * Games are anonymized to preserve history for opponents
 * 
 * @returns {Object} { success: boolean, message: string }
 * @throws {HttpsError} 'unauthenticated' if not logged in
 * @throws {HttpsError} 'internal' if deletion fails
 */
deleteAccount(): Promise<{ success: boolean, message: string }>
```

### React Hook

```javascript
/**
 * Delete the current user's account
 * 
 * @returns {Promise<Object>} Result object with success status
 * @example
 * const { deleteAccount } = useFirebaseFunctions();
 * 
 * try {
 *   await deleteAccount();
 *   // Handle success
 * } catch (error) {
 *   // Handle error
 * }
 */
deleteAccount(): Promise<{
  success: boolean,
  message: string
}>
```

## Future Enhancements

### Potential Improvements
1. **Download Data:** Allow users to export their data before deletion (GDPR Article 20)
2. **Grace Period:** Optional 30-day grace period for account recovery
3. **Email Confirmation:** Send confirmation email after deletion
4. **Deletion Reasons:** Collect optional feedback on why users are deleting
5. **Partial Deletion:** Allow deleting specific data types instead of full account

### Known Limitations
1. **No Recovery:** Once deleted, account cannot be recovered
2. **Game History:** Games remain in Firestore (anonymized) for opponents
3. **No Export:** Users cannot download their data before deletion
4. **Immediate:** No grace period for accidental deletions

## Version History

### v1.0.0 - Initial Implementation
- Basic account deletion functionality
- Two-step confirmation process
- Game anonymization
- Friends and social data cleanup
- Firebase Auth account deletion
- Comprehensive test coverage
- User-facing UI in Settings
- Documentation

## Support

For users experiencing issues with account deletion:
1. Try again after a few minutes
2. Check internet connection
3. Contact support through in-app issue submission
4. Provide user ID and timestamp for debugging

For developers:
- Check Firebase Functions logs for detailed error messages
- Review test suite for expected behavior
- Verify Firestore security rules haven't changed
- Ensure Firebase Admin SDK has proper permissions

