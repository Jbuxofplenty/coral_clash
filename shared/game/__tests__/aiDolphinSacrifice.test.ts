import { findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';
import { CoralClash } from '../v1.0.0/coralClash';
import { createGameSnapshot } from '../v1.0.0/gameState';

describe('AI Should Not Sacrifice Dolphin Unnecessarily', () => {
    jest.setTimeout(60000); // 60s to cover two tests on slow CI runners

    it('should not throw away hunter dolphin for a temporary check', () => {
        // This test reproduces a specific regression where the AI made a poor move:
        // - Black (AI) moved hunter dolphin f6 to h4 to put white in check
        // - But white could capture the dolphin at h4 with no consequence (h5 gatherer dolphin)
        // 
        // Starting from a fresh board with:
        // - White gatherer dolphin e2 to h5
        // - Black hunter dolphin e7 to f6
        // - White hunter crab f2 to e2
        // 
        // At this point, black should NOT move the dolphin to h4 where it can be
        // captured for free by the white gatherer dolphin on h5.

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
        const snapshot = createGameSnapshot(game);
        
        // Get the AI's move with sufficient depth to detect the dolphin blunder.
        // Keep time and depth conservative so CI runners (GitHub Actions) don't
        // run out of memory or exceed the jest timeout on high-branching positions.
        // Depth 2 can see the immediate recapture (f6->h4, h5->h4), which is all we need.
        const result = findBestMoveIterativeDeepening(
            snapshot,
            4, // Max depth 4 (time-limited to depth 2 on CI, which is sufficient)
            'b', // Black to move
            10000, // 10 seconds - well within the 60s jest timeout
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
        // On a near-starting-position (28 pieces, high branching factor), depth 3 takes
        // >10 seconds on CI. Depth 2 is reliably achievable and sufficient to detect
        // a 2-ply regression (move + opponent's immediate recapture).
        expect(result.depth).toBeGreaterThanOrEqual(2);
        
        console.log(`AI chose: ${result.move.from} -> ${result.move.to}`);
        
        // REGRESSION CHECK: The AI should NOT play f6->h4.
        // h4 is directly attacked by the white gatherer dolphin on h5 (one step away),
        // which can immediately recapture. Moving there for a check is a free piece loss.
        const choseHangingH4 = result.move.from === 'f6' && result.move.to === 'h4';
        if (choseHangingH4) {
            console.log('REGRESSION: AI moved hunter dolphin to h4 where it is immediately captured by h5!');
        } else {
            console.log(`Good! AI did not play the blunder f6->h4`);
        }
        expect(choseHangingH4).toBe(false);
        
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
