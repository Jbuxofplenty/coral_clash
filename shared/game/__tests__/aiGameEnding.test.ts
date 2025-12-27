import { findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';
import { CoralClash } from '../v1.0.0/coralClash';
import { createGameSnapshot } from '../v1.0.0/gameState';

describe('AI Game Ending Logic', () => {
    it('should correctly evaluate coral victory when crab reaches home row', () => {
        const game = new CoralClash();
        
        // Extended FEN with white crab on rank 8 (black's home row), triggering coral scoring
        // Format: FEN roles coral coralCounts whales
        const fen = 'C7/8/8/8/8/8/8/8 w - - 0 1 a8h d5w,e5w 15,17 -';
        game.load(fen, { skipFenValidation: true });
        
        // Check that coral scoring is triggered
        expect((game as any)._shouldTriggerCoralScoring()).toBe(true);
        
        // AI should recognize this situation and find a move
        const snapshot = createGameSnapshot(game);
        const result = findBestMoveIterativeDeepening(
            snapshot,
            3,
            'w',
            1000,
            null,
            null,
            'easy'
        );
        
        // Should find a move
        expect(result.move).toBeDefined();
    });

    it('should correctly evaluate coral victory when octopus reaches home row', () => {
        const game = new CoralClash();
        
        // Extended FEN with black octopus on rank 1 (white's home row)
        const fen = 'o7/8/8/8/8/8/8/8 b - - 0 1 a8h d5b,e5b,d4b 17,14 -';
        game.load(fen, { skipFenValidation: true });
        
        // Check that coral scoring is triggered
        expect((game as any)._shouldTriggerCoralScoring()).toBe(true);
        
        // Black should have more coral control
        const coralWinner = game.isCoralVictory();
        expect(coralWinner).toBe('b');
    });

    it('should correctly evaluate when all coral is placed', () => {
        const game = new CoralClash();
        
        // All white coral placed (w=0)
        const fen = '8/8/8/8/8/8/8/8 w - - 0 1 - - 0,5 -';
        game.load(fen, { skipFenValidation: true });
        
        // Should trigger coral scoring
        expect((game as any)._shouldTriggerCoralScoring()).toBe(true);
    });

    it('should correctly evaluate when only whale remains', () => {
        const game = new CoralClash();
        
        // Only whales remaining for both sides
        const fen = 'h7/8/8/8/8/8/8/H7 w - - 0 1 - - 17,17 a1b1,a8b8';
        game.load(fen, { skipFenValidation: true });
        
        // Should trigger coral scoring (only whales left)
        expect((game as any)._shouldTriggerCoralScoring()).toBe(true);
    });

    it('should correctly handle game over scenarios in alpha-beta search', () => {
        const game = new CoralClash();
        
        // Create a position with limited pieces
        const fen = '7h/8/8/8/8/8/8/7H w - - 0 1 - - 17,17 h1g1,h8g8';
        game.load(fen, { skipFenValidation: true });
        
        const snapshot = createGameSnapshot(game);
        const result = findBestMoveIterativeDeepening(
            snapshot,
            3,
            'w',
            1000,
            null,
            null,
            'easy'
        );
        
        // AI should still function and try to find a move if available
        expect(result).toBeDefined();
        expect(result.score).toBeDefined();
    });
});
