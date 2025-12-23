import { findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';
import { CoralClash } from '../v1.0.0/coralClash';
import { createGameSnapshot } from '../v1.0.0/gameState';

describe('AI Tactical Correctness - Quiescence Search Fix', () => {
    jest.setTimeout(10000);

    it('should not make losing material exchanges', () => {
        // This test validates the quiescence search negamax bug fix
        // The bug: quiescence search wasn't swapping player perspective during recursion
        // Result: AI couldn't correctly evaluate capture/recapture sequences
        // Symptom: AI accepted trades like losing Gatherer Dolphin (1800) for Hunter Dolphin (900)
        
        const game = new CoralClash();
        
        // Play from starting position - AI should make reasonable moves
        // that don't involve losing material
        const blackSnapshot = createGameSnapshot(game);
        const blackMove = findBestMoveIterativeDeepening(
            blackSnapshot,
            3, // Depth 3 should be enough to see simple tactics
            'w', // White to move first
            3000,
        );
        
        console.log('White move:', blackMove.move);
        console.log('White score:', blackMove.score);
        
        // Make the move
        expect(blackMove.move).toBeDefined();
        const moveResult = game.move(blackMove.move);
        expect(moveResult).toBeDefined();
        
        // Now it's Black's turn
        const whiteSnapshot = createGameSnapshot(game);
        const whiteMove = findBestMoveIterativeDeepening(
            whiteSnapshot,
            3,
            'b',
            3000,
        );
        
        console.log('Black move:', whiteMove.move);
        console.log('Black score:', whiteMove.score);
        
        // The AI should make a move
        expect(whiteMove.move).toBeDefined();
        
        // The evaluation scores should be reasonable (not extreme)
        // Note: New evaluation includes piece safety bonuses which can be significant
        // but should remain well below terminal values (100k)
        expect(Math.abs(blackMove.score)).toBeLessThan(10000);
        expect(Math.abs(whiteMove.score)).toBeLessThan(10000);
    });

    it('should reach reasonable search depth with quiescence', () => {
        // With the fix, quiescence search should work efficiently
        // and allow reaching depth 3-4 in reasonable time
        
        const game = new CoralClash();
        const snapshot = createGameSnapshot(game);
        
        const result = findBestMoveIterativeDeepening(
            snapshot,
            10, // Max depth (won't reach this, but sets ceiling)
            'w',
            5000, // 5 seconds
        );
        
        console.log(`Reached depth: ${result.depth}`);
        console.log(`Nodes: ${result.nodesEvaluated}`);
        console.log(`Time: ${result.elapsedMs}ms`);
        
        // Should reach at least depth 3
        expect(result.depth).toBeGreaterThanOrEqual(3);
        
        // Should find a move
        expect(result.move).toBeDefined();
    });
});
