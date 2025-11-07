import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';
import { admin } from '../init.js';
import { getAppCheckConfig } from '../utils/appCheckConfig.js';
import { serverTimestamp } from '../utils/helpers.js';

const db = admin.firestore();

// Define the GitHub PAT secret
const githubPat = defineSecret('GITHUB_PAT');

/**
 * Handler for submitting an issue
 * Separated for testing purposes
 */
async function submitIssueHandler(request) {
    const { data, auth } = request;
    const { subject, description, gameSnapshot } = data;

    // Validate required fields
    if (!subject || !description) {
        throw new HttpsError('invalid-argument', 'Subject and description are required');
    }

    if (subject.length < 3 || subject.length > 200) {
        throw new HttpsError('invalid-argument', 'Subject must be between 3 and 200 characters');
    }

    if (description.length < 10 || description.length > 5000) {
        throw new HttpsError('invalid-argument', 'Description must be between 10 and 5000 characters');
    }

    // Get userId from auth if available (user might not be logged in)
    const userId = auth ? auth.uid : null;

    try {
        // Create issue document in Firestore
        const issueData = {
            subject,
            description,
            userId,
            gameSnapshot: gameSnapshot || null,
            status: 'open',
            createdAt: serverTimestamp(),
        };

        const issueRef = await db.collection('issues').add(issueData);
        const issueId = issueRef.id;

        // Create GitHub issue
        let githubIssueNumber = null;
        try {
            githubIssueNumber = await createGitHubIssue({
                subject,
                description,
                gameSnapshot,
                issueId,
                githubPat: process.env.GITHUB_PAT,
            });

            // Update Firestore with GitHub issue number
            await issueRef.update({
                githubIssueNumber,
            });
        } catch (githubError) {
            console.error('Error creating GitHub issue:', githubError);
            // Don't fail the request if GitHub issue creation fails
            // The issue is still stored in Firestore
            await issueRef.update({
                githubError: githubError.message,
            });
        }

        return {
            success: true,
            issueId,
            githubIssueNumber,
        };
    } catch (error) {
        console.error('Error submitting issue:', error);
        throw new HttpsError('internal', 'Failed to submit issue');
    }
}

/**
 * Create a GitHub issue via REST API
 * @param {Object} params - Issue parameters
 * @param {string} params.subject - Issue subject/title
 * @param {string} params.description - Issue description
 * @param {Object} params.gameSnapshot - Optional game snapshot
 * @param {string} params.issueId - Firestore issue ID
 * @param {string} params.githubPat - GitHub Personal Access Token
 * @returns {Promise<number>} GitHub issue number
 */
async function createGitHubIssue({ subject, description, gameSnapshot, issueId, githubPat }) {
    if (!githubPat) {
        throw new Error('GitHub PAT not configured');
    }

    // Format the issue body
    let body = `${description}\n\n`;
    body += `---\n`;
    body += `**Firestore Issue ID**: ${issueId}\n`;

    // Add game snapshot if provided
    if (gameSnapshot && gameSnapshot.fen) {
        body += `\n### Game State\n`;
        body += `**FEN**: \`${gameSnapshot.fen}\`\n`;
        body += `**Turn**: ${gameSnapshot.turn}\n`;
        
        if (gameSnapshot.isGameOver) {
            body += `**Status**: Game Over\n`;
            if (gameSnapshot.isCheckmate) {
                body += `**Result**: Checkmate\n`;
            } else if (gameSnapshot.isCoralVictory) {
                body += `**Result**: Coral Victory\n`;
            } else if (gameSnapshot.isDraw) {
                body += `**Result**: Draw\n`;
            } else if (gameSnapshot.resigned) {
                body += `**Result**: ${gameSnapshot.resigned} resigned\n`;
            }
        } else if (gameSnapshot.isCheck) {
            body += `**Status**: In Check\n`;
        }
    }

    // Create the GitHub issue
    const response = await fetch('https://api.github.com/repos/jbuxofplenty/coral_clash/issues', {
        method: 'POST',
        headers: {
            'Accept': 'application/vnd.github.v3+json',
            'Authorization': `token ${githubPat}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            title: subject,
            body: body,
            labels: ['user-reported'],
        }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error (${response.status}): ${errorText}`);
    }

    const issue = await response.json();
    return issue.number;
}

/**
 * Submit an issue/feedback
 * POST /api/issues
 */
export const submitIssue = onCall(
    {
        ...getAppCheckConfig(),
        secrets: [githubPat],
        // Allow unauthenticated users to submit issues
        enforceAppCheck: false,
    },
    submitIssueHandler,
);

