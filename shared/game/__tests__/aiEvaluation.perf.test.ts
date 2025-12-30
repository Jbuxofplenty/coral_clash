import { findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';
import { CoralClash } from '../v1.0.0/coralClash';
import { createGameSnapshot } from '../v1.0.0/gameState';

describe('AI Performance', () => {
    // Increase timeout for performance tests
    jest.setTimeout(10000);

    it('should reach depth 3+ in easy mode with quiescence search', () => {
        const game = new CoralClash();
        const maxTimeMs = 5000; // 5 seconds should be enough to reach depth 3+
        // Standard starting position

        console.log(`Testing easy mode with max time ${maxTimeMs}ms (with quiescence search)`);

        const result = findBestMoveIterativeDeepening(
            createGameSnapshot(game),
            20, // maxDepth - allow it to go deep if fast enough
            'w', // player color
            maxTimeMs,
            null,
            null,
            'easy',
            1
        );

        console.log(`Reached depth: ${result.depth}`);
        console.log(`Nodes evaluated: ${result.nodesEvaluated}`);
        console.log(`Time elapsed: ${result.elapsedMs}ms`);

        // Assertion: Easy mode should reach at least depth 3 with quiescence search
        // Depth significantly reduced from 6 due to quiescence search exploring many capture sequences
        // However, tactical correctness is greatly improved - no more blunders
        expect(result.depth).toBeGreaterThanOrEqual(3);
    });
});
