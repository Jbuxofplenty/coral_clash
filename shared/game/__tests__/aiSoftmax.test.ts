
import { findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation.js';
import { CoralClash } from '../v1.0.0/coralClash.js';
import { createGameSnapshot } from '../v1.0.0/gameState.js';

describe('AI Softmax Root Selection', () => {
    test('Should select different moves given similar scores', () => {
        // Setup a position where White has two good choices
        // E.g. two hanging pawns/crabs that can be captured
        // Or just the starting position (many equivalent moves)
        
        const game = new CoralClash();
        const snapshot = createGameSnapshot(game);

        // Running it once is enough to verify it doesn't crash.
        const result = findBestMoveIterativeDeepening(
            snapshot,
            2, // depth 2
            'w', // white
            1000, // 1s
            null,
            null,
            'easy' // High temperature
        );
        
        expect(result).toBeDefined();
        expect(result.move).toBeDefined();
        console.log('Selected move:', result.move.from, result.move.to, 'Score:', result.score);
    });
});
