import { evaluatePosition, findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';
import { CoralClash } from '../v1.0.0/coralClash';
import { createGameSnapshot } from '../v1.0.0/gameState';

describe('AI Reproduction', () => {
    // Increase timeout significantly
    jest.setTimeout(30000);

    it('should not hang in reported position', () => {
        const fen = '7f/1cch2T1/8/3C1T2/8/3O3O/t1CD3C/FT1H4 b - - 0 29 h8g,b7g,c7h,g7h,d5h,f5g,d3g,h3h,a2g,c2g,d2h,h2g,a1h,b1g a8b,g8b,b7b,c7b,f7b,h7w,e6b,h6b,e5b,f5w,h5w,d4w,e4w,h4w,c3w,d3w,e3w,a2b,b1w 7,8 d1e1,d7e7';
        const game = new CoralClash(fen);
        const maxTimeMs = 10000;
        
        console.log(`Starting search for FEN: ${fen}`);

        const result = findBestMoveIterativeDeepening(
            createGameSnapshot(game),
            8, // hard maxDepth
            'b', // turn
            maxTimeMs,
            null,
            null,
            'hard',
            1
        );

        console.log(`Search result:`, result);
        
        expect(result).toBeDefined();
        expect(result.move).toBeDefined();
        
        // Benchmark
        const start = Date.now();
        for (let i = 0; i < 100; i++) {
            evaluatePosition(createGameSnapshot(game), 'b');
        }
        const evalTime = Date.now() - start;
        console.log(`100 evaluations took ${evalTime}ms (${evalTime/100}ms/op)`);

        const startMoves = Date.now();
        for (let i = 0; i < 10; i++) {
            game.internalMoves();
        }
        const moveTime = Date.now() - startMoves;
        console.log(`10 move generations took ${moveTime}ms (${moveTime/10}ms/op)`);
    });
});
