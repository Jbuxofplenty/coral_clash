import { getPieceValue } from '../v1.0.0/aiConfig';
import { findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';
import { CoralClash } from '../v1.0.0/coralClash';
import { createGameSnapshot } from '../v1.0.0/gameState';

describe('AI Should Not Sacrifice Dolphin Unnecessarily', () => {
    jest.setTimeout(30000);

    it('should not throw away hunter dolphin for a temporary check', () => {
        // This test reproduces a specific scenario where the AI made a poor move:
        // - Black (AI) moved hunter dolphin f6 to h4 to put white in check
        // - But white could capture the dolphin at h4 with no consequence
        // 
        // Starting from a fresh board with:
        // - White gatherer dolphin e2 to h5
        // - Black hunter dolphin e7 to f6
        // - White hunter crab f2 to e2
        // 
        // At this point, black should prevent its hunter dolphin from being taken.
        // The AI should NOT move the dolphin to h4 where it can be captured for free.

        const game = new CoralClash();
        
        // Starting position
        console.log('Initial position:', game.fen());
        
        // Move 1: White gatherer dolphin e2 to h5
        const whiteMove1 = game.move({ from: 'e2', to: 'h5' });
        expect(whiteMove1).toBeDefined();
        console.log('After white e2->h5:', game.fen());
        
        // Move 2: Black hunter dolphin e7 to f6
        const blackMove1 = game.move({ from: 'e7', to: 'f6' });
        expect(blackMove1).toBeDefined();
        console.log('After black e7->f6:', game.fen());
        
        // Move 3: White hunter crab f2 to e2
        const whiteMove2 = game.move({ from: 'f2', to: 'e2' });
        expect(whiteMove2).toBeDefined();
        console.log('After white f2->e2:', game.fen());
        
        // Now it's Black's turn - the AI should make a move
        // The AI should NOT move the hunter dolphin from f6 to h4
        const snapshot = createGameSnapshot(game);
        
        // Get the AI's move with sufficient time and depth
        const result = findBestMoveIterativeDeepening(
            snapshot,
            6, // Depth 6 to see deeper threats
            'b', // Black to move
            30000, // 30 seconds to ensure deeper search
            null, // No progress callback
            null, // No last move
            'hard', // Use hard difficulty for best evaluation
            -1 // Disable softmax for deterministic best move
        );
        
        console.log('AI chose move:', result.move);
        console.log('AI evaluation score:', result.score);
        console.log('Search depth reached:', result.depth);
        console.log('Nodes evaluated:', result.nodesEvaluated);
        
        expect(result.move).toBeDefined();
        expect(result.depth).toBeGreaterThanOrEqual(3); // Should reach at least depth 3
        
        console.log(`AI moved dolphin from ${result.move.from} to ${result.move.to}`);
        
        // Check if the AI moved the hunter dolphin from f6
        if (result.move.from === 'f6') {
            // Simulate the AI's move
            const testGame = new CoralClash();
            testGame.load(game.fen());
            const aiMove = testGame.move(result.move);
            expect(aiMove).toBeDefined();
            
            const dolphinSquare = result.move.to;
            
            // Check if white can capture the dolphin on the next move
            const whiteMoves = testGame.moves({ verbose: true });
            const capturesAtDolphinSquare = whiteMoves.filter(
                m => m.to === dolphinSquare && m.captured
            );
            
            if (capturesAtDolphinSquare.length > 0) {
                console.log(`WARNING: AI moved dolphin to ${dolphinSquare} where it can be captured!`);
                console.log('Possible captures:', 
                    capturesAtDolphinSquare.map(m => `${m.from}->${m.to}`).join(', '));
                
                // Check if this move delivers checkmate or wins material
                const isCheckmate = testGame.isCheckmate();
                const capturedValuablePiece = result.move.captured 
                    && getPieceValue(result.move.captured, 'hunter') >= 900;
                
                console.log('Is checkmate:', isCheckmate);
                console.log('Captured valuable piece:', capturedValuablePiece);
                
                // The dolphin sacrifice should only be acceptable if:
                // 1. It delivers checkmate, OR
                // 2. It captured a valuable piece (dolphin or better), OR
                // 3. It's forcing a winning sequence
                const isSacrificeJustified = isCheckmate || capturedValuablePiece;
                
                if (!isSacrificeJustified) {
                    const hunterDolphinValue = getPieceValue('d', 'hunter');
                    console.log(`Black loses hunter dolphin worth ${hunterDolphinValue} points without compensation`);
                }
                
                // The AI should NOT sacrifice the dolphin without good reason
                expect(isSacrificeJustified).toBe(true);
            } else {
                console.log(`Good! Dolphin at ${dolphinSquare} is safe from immediate capture`);
            }
        }
        
        // Log some valid alternative moves the AI could have made
        const allMoves = game.moves({ verbose: true });
        const dolphinMoves = allMoves.filter(m => m.from === 'f6');
        console.log('Valid moves for hunter dolphin at f6:', 
            dolphinMoves.map(m => `${m.from}->${m.to}`).join(', '));
    });
    
    it('should correctly evaluate the material exchange f6->h4 followed by h5->h4', () => {
        // This test verifies that the AI's evaluation correctly recognizes
        // that moving f6->h4 would result in losing the hunter dolphin for free
        
        const game = new CoralClash();
        
        // Replay the same position
        game.move({ from: 'e2', to: 'h5' }); // White gatherer dolphin
        game.move({ from: 'e7', to: 'f6' }); // Black hunter dolphin
        game.move({ from: 'f2', to: 'e2' }); // White hunter crab
        

        
        // Manually evaluate the bad move: f6->h4
        const testGame = new CoralClash();
        testGame.load(game.fen());
        
        const badMove = testGame.move({ from: 'f6', to: 'h4' });
        expect(badMove).toBeDefined();
        
        // After f6->h4, evaluate from white's perspective
        const whiteSnapshot = createGameSnapshot(testGame);
        const whiteResponse = findBestMoveIterativeDeepening(
            whiteSnapshot,
            3,
            'w',
            5000,
            null,
            null,
            'hard',
            -1
        );
        
        console.log('White\'s best response:', whiteResponse.move);
        console.log('White\'s evaluation:', whiteResponse.score);
        
        // White should move gatherer dolphin to h4
        expect(whiteResponse.move?.from).toBe('h5');
        expect(whiteResponse.move?.to).toBe('h4');
        
        // Note: The move might be h5->h4 with coral placement rather than a direct capture
        // because the dolphin at h4 hasn't been captured yet in this position
        // But after this move, the hunter dolphin at h4 will be captured or threatened
        
        // The score should be heavily in white's favor
        // (threatening/capturing hunter dolphin = significant material advantage)
        expect(whiteResponse.score).toBeGreaterThan(500);
        
        console.log('Confirmed: f6->h4 results in white gaining significant advantage');
    });
});
