# Issue Submission Feature

This document describes the issue/feedback submission system that allows users to report bugs and submit feedback directly from the app.

## Overview

The issue submission feature enables users to:
- Submit feedback or report issues from the app drawer menu
- Report bugs with game state snapshots from the game board menu
- Automatically create GitHub issues for tracking
- Store submissions in Firestore for record-keeping

## Architecture

### Frontend Components

#### ReportIssue Screen (`src/screens/ReportIssue.js`)
- Form with subject and description inputs
- Validation for minimum/maximum character lengths
- Optional game snapshot handling via navigation params
- Success/error handling with user feedback
- Available to both logged-in and anonymous users

#### Navigation Integration
- Added to drawer menu in both logged-in and logged-out states
- Positioned after "How-To Play" menu item
- Uses bug icon (`MaterialIcons/bug`)
- Accessible via `navigation.navigate('Report Issue', { gameSnapshot })`

#### Game Board Integration (`src/components/BaseCoralClashBoard.js`)
- "Report Bug" menu item in game board menu
- Located after "Flip Board" option
- Automatically captures game state using `createGameSnapshot()`
- Navigates to ReportIssue screen with game snapshot

### Backend Implementation

#### Firebase Function (`functions/routes/issues.js`)
The `submitIssue` callable function handles:

1. **Validation**
   - Subject: 3-200 characters
   - Description: 10-5000 characters

2. **Firestore Storage**
   - Creates document in `issues` collection
   - Stores: subject, description, userId, gameSnapshot, status, createdAt
   - Returns auto-generated issueId

3. **GitHub Integration**
   - Creates issue in `jbuxofplenty/coral_clash` repository
   - Includes formatted issue body with:
     - Description
     - Firestore issue ID
     - Game state (FEN, turn, game status) if provided
   - Adds `user-reported` label
   - Stores GitHub issue number in Firestore

4. **Error Handling**
   - Submission succeeds even if GitHub issue creation fails
   - GitHub errors are logged to Firestore document
   - Client receives success with partial result

### Client Hook Integration

#### useFirebaseFunctions Hook
```javascript
const { submitIssue } = useFirebaseFunctions();

await submitIssue({
  subject: "Bug with checkmate detection",
  description: "Checkmate not detected when...",
  gameSnapshot: snapshot // optional
});
```

## Firestore Schema

### Issues Collection (`/issues/{issueId}`)

```javascript
{
  subject: string,           // Issue title/subject (3-200 chars)
  description: string,       // Detailed description (10-5000 chars)
  userId: string | null,     // Firebase user ID (null if anonymous)
  gameSnapshot: {            // Optional game state
    fen: string,            // Extended FEN notation
    turn: 'w' | 'b',       // Current turn
    whalePositions: object, // Whale piece positions
    coral: object,          // Coral placement data
    coralRemaining: object, // Remaining coral counts
    pieceRoles: object,     // Hunter/gatherer roles
    pgn: string,            // Move history
    isCheck: boolean,
    isCheckmate: boolean,
    isGameOver: boolean,
    isCoralVictory: boolean,
    isDraw: boolean,
    resigned: string | null
  } | null,
  status: 'open',            // Issue status
  githubIssueNumber: number | null, // GitHub issue #
  githubError: string | null, // Error if GitHub creation failed
  createdAt: timestamp       // Creation timestamp
}
```

## GitHub Integration

### Personal Access Token Setup

The GitHub integration requires a Personal Access Token (PAT) with permissions to create issues.

#### Option 1: Fine-grained Token (Recommended)

Fine-grained tokens provide better security with more specific permissions:

1. Go to https://github.com/settings/tokens?type=beta
2. Click "Generate new token"
3. Token name: "Coral Clash Issue Reporter"
4. Expiration: 90 days or 1 year (recommended)
5. Repository access: "Only select repositories" → select `coral_clash`
6. Repository permissions:
   - Issues: **Read and write** ✓
7. Click "Generate token"
8. Copy the token (starts with `github_pat_`)

#### Option 2: Classic Token

Classic tokens have broader permissions:

1. Go to https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: "Coral Clash Issue Reporter"
4. Expiration: 90 days or 1 year (recommended)
5. Scopes: ✓ `repo` (Full control of private repositories)
6. Click "Generate token"
7. Copy the token (starts with `ghp_`)

#### Set Firebase Secret

Use the provided script:

```bash
./scripts/setup-github-pat.sh
```

This script will:
- Validate Firebase CLI authentication
- Prompt for your GitHub PAT
- Set `GITHUB_PAT` secret in Firebase Functions
- Provide deployment instructions

Manual alternative:
```bash
echo "your-github-pat" | firebase functions:secrets:set GITHUB_PAT
```

#### Update Functions After Secret Setup

After setting the secret, redeploy functions:
```bash
firebase deploy --only functions
```

The `submitIssue` function uses the secret via:
```javascript
import { defineSecret } from 'firebase-functions/v2/params';
const githubPat = defineSecret('GITHUB_PAT');

export const submitIssue = onCall(
  {
    ...getAppCheckConfig(),
    secrets: [githubPat],
  },
  submitIssueHandler
);
```

### GitHub Issue Format

Created issues include:

**Title**: User-provided subject

**Body**:
```markdown
{user description}

---
**Firestore Issue ID**: {issueId}

### Game State
**FEN**: `{fen notation}`
**Turn**: {white/black}
**Status**: {Game Over/In Check/etc}
**Result**: {Checkmate/Coral Victory/Draw/Resigned}
```

**Labels**: `user-reported`

## Testing

### Backend Tests (`functions/__tests__/issues.test.js`)

Test coverage includes:
- ✓ Issue creation with all fields
- ✓ Issue creation without game snapshot
- ✓ Issue creation without userId (anonymous)
- ✓ Success despite GitHub failure
- ✓ Validation errors (missing/invalid fields)
- ✓ Character length limits
- ✓ Game state inclusion in GitHub issue body
- ✓ GitHub API mocking

Run tests:
```bash
cd functions
yarn test issues.test.js
```

### Manual Testing

1. **Drawer Menu Submission**
   - Open drawer → "Report Issue"
   - Submit with valid subject/description
   - Verify success message
   - Check Firestore for document
   - Check GitHub for created issue

2. **Game Board Bug Report**
   - Start a game
   - Open game menu → "Report Bug"
   - Submit issue
   - Verify game state included in GitHub issue

3. **Anonymous Submission**
   - Log out
   - Submit issue from drawer
   - Verify userId is null in Firestore

4. **Validation Testing**
   - Try submitting with short subject/description
   - Verify validation errors shown

## User Experience Flow

### Feedback/Issue Submission
1. User opens drawer menu
2. Taps "Report Issue"
3. Fills in subject and description
4. Taps "Submit Issue"
5. Sees loading state
6. Receives success confirmation with GitHub issue number
7. Returns to previous screen

### Bug Report from Game
1. User encounters bug during game
2. Opens game board menu (⋮)
3. Taps "Report Bug"
4. Navigates to ReportIssue screen with pre-loaded game state
5. Sees indicator: "✓ Game state will be included"
6. Fills in subject and description
7. Submits (game state automatically included)
8. Returns to game

## Security Considerations

1. **App Check**: Enforced on authenticated users, optional for anonymous
2. **Rate Limiting**: Consider implementing rate limits to prevent spam
3. **Input Validation**: Server-side validation of all fields
4. **Secret Management**: GitHub PAT stored as Firebase secret (never in code)
5. **Anonymous Access**: Allowed to encourage bug reporting

## Future Enhancements

Potential improvements:
- Add issue status tracking (open/closed/resolved)
- User notification when issue is closed
- Issue history for logged-in users
- Duplicate detection
- Admin dashboard for issue management
- Rate limiting per user/IP
- Image/screenshot attachment support
- Issue categories/types selection

## Troubleshooting

### "Failed to submit issue"
- Check network connection
- Verify Firebase Functions are deployed
- Check Firebase Console logs for errors

### GitHub issues not being created
- Verify GITHUB_PAT secret is set: `firebase functions:secrets:access GITHUB_PAT`
- Check PAT has `repo` scope and hasn't expired
- Verify repository name in `functions/routes/issues.js` is correct
- Check Firebase Functions logs for GitHub API errors

### Issues stored but GitHub creation fails
- This is expected behavior (graceful degradation)
- Firestore document will have `githubError` field with details
- Fix the issue and manually create GitHub issue if needed

## Maintenance

### Rotating GitHub PAT

When your PAT expires or needs rotation:

1. Create new PAT (same scopes)
2. Run setup script:
   ```bash
   ./scripts/setup-github-pat.sh
   ```
3. Deploy functions:
   ```bash
   firebase deploy --only functions
   ```

### Monitoring

Check Firebase Console logs for:
- Issue submission frequency
- GitHub API failures
- Validation errors
- Anonymous vs authenticated submissions

Query Firestore for statistics:
```javascript
// Count total issues
db.collection('issues').count()

// Find failed GitHub creations
db.collection('issues')
  .where('githubError', '!=', null)
  .get()
```

## Related Documentation

- [Firebase Setup](./firebase_setup.md)
- [GitHub Secrets Setup](./github_secrets_setup.md)
- [Architecture](./architecture.md)

