import { CloudTasksClient } from '@google-cloud/tasks';
import { admin } from '../init.js';

const db = admin.firestore();

/**
 * Cancel pending timeout task for a game
 * @param {string} gameId - The game ID
 * @param {string} taskName - The task name to cancel
 * @param {boolean} skipFirestoreUpdate - If true, skip updating Firestore (caller will handle it)
 */
export async function cancelPendingTimeoutTask(gameId, taskName, skipFirestoreUpdate = false) {
    // Skip in emulator
    if (process.env.FUNCTIONS_EMULATOR === 'true' || !taskName) {
        return;
    }

    try {
        const client = new CloudTasksClient();

        await client.deleteTask({ name: taskName });
        console.log(`Cancelled timeout task for game ${gameId}`);

        // Clear the task name from Firestore (unless caller will handle it)
        if (!skipFirestoreUpdate) {
            await db.collection('games').doc(gameId).update({
                pendingTimeoutTask: null,
            });
        }
    } catch (error) {
        // Task might already be executed or not exist, which is fine
        console.log(`Could not cancel task for game ${gameId}:`, error.message);
    }
}

/**
 * Create a Cloud Task to handle time expiration for the current player
 * @param {string} gameId - The game ID
 * @param {number} timeRemainingSeconds - Seconds remaining for the current player
 * @returns {Promise<string|null>} Task name or null if skipped
 */
export async function createTimeoutTask(gameId, timeRemainingSeconds) {
    // Skip in emulator - timeouts won't work properly in local development
    if (process.env.FUNCTIONS_EMULATOR === 'true') {
        console.log(`[Emulator] Skipping timeout task creation for game ${gameId}`);
        return null;
    }

    // Don't create task if time is unlimited or already expired
    if (!timeRemainingSeconds || timeRemainingSeconds <= 0) {
        return null;
    }

    try {
        const client = new CloudTasksClient();
        const project = process.env.GCLOUD_PROJECT;
        const location = process.env.FUNCTION_REGION || 'us-central1';
        const queue = 'game-timeouts'; // You'll need to create this queue in GCP

        // Task should execute when time expires
        const scheduleTime = new Date(Date.now() + timeRemainingSeconds * 1000);

        const queuePath = client.queuePath(project, location, queue);

        // Get the function URL - adjust based on your deployment
        const functionUrl = `https://${location}-${project}.cloudfunctions.net/handleTimeExpiration`;

        const task = {
            httpRequest: {
                httpMethod: 'POST',
                url: functionUrl,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: Buffer.from(JSON.stringify({ gameId })).toString('base64'),
                oidcToken: {
                    serviceAccountEmail: `${project}@appspot.gserviceaccount.com`,
                },
            },
            scheduleTime: {
                seconds: Math.floor(scheduleTime.getTime() / 1000),
            },
        };

        const [response] = await client.createTask({ parent: queuePath, task });
        console.log(`Created timeout task for game ${gameId}: ${response.name}`);
        return response.name;
    } catch (error) {
        console.error(`Error creating timeout task for game ${gameId}:`, error);
        return null;
    }
}
