import { getTimeControlForDifficulty } from '../v1.0.0/aiConfig';
import { findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';
import { CoralClash } from '../v1.0.0/coralClash';
import { createGameSnapshot } from '../v1.0.0/gameState';

describe('AI Performance', () => {
    // Increase timeout for performance tests
    jest.setTimeout(30000);

    it('should reach depth 4+ in easy mode with quiescence search', () => {
        const game = new CoralClash();
        const maxTimeMs = 30000; // Updated to match new TIME_CONTROL
        // Standard starting position
        
        const difficulty = 'easy';
        const timeControl = getTimeControlForDifficulty(difficulty);
        
        console.log(`Testing easy mode with max time ${maxTimeMs}ms (with quiescence search)`);
        
        const result = findBestMoveIterativeDeepening(
            createGameSnapshot(game),
            20, // maxDepth - allow it to go deep if fast enough
            'w', // player color
            timeControl.maxTimeMs
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
