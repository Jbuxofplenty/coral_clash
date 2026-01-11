import { findBestMoveIterativeDeepening } from '@jbuxofplenty/coral-clash';
import { parentPort, workerData } from 'worker_threads';

if (parentPort) {
    try {
        const {
            gameState,
            maxDepth,
            playerColor,
            maxTimeMs,
            lastMove,
            difficulty,
            randomSeed
        } = workerData;

        // Run the AI search synchronously in this thread
        const result = findBestMoveIterativeDeepening(
            gameState,
            maxDepth,
            playerColor,
            maxTimeMs,
            null, // progressCallback not supported across threads easily yet
            lastMove,
            difficulty,
            randomSeed
        );

        // Send the result back to the main thread
        parentPort.postMessage(result);
    } catch (error) {
        // If an error occurs (even a synchronous one), verify we catch it
        // and send it back so the main thread doesn't hang waiting
        console.error('[AI Worker] Error in search:', error);
        // We can't really "throw" to the parent, but we can exit or send an error object
        // For now, let's just exit with error code, which emits 'error' on worker
        process.exit(1);
    }
}
