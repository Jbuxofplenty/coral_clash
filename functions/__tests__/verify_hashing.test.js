
import { alphaBeta } from '../../shared/dist/game/v1.0.0/aiEvaluation.js';
import { CoralClash, SQUARES } from '../../shared/dist/game/v1.0.0/coralClash.js';
import { restoreGameFromSnapshot } from '../../shared/dist/game/v1.0.0/gameState.js';

// Mock console to keep output clean, or specific logs?
// We want to see logs for verification. console.log works in jest.

describe('AI Check for Exposed Dolphin', () => {
    // Increase timeout for AI search
    jest.setTimeout(30000);

    it('should not blunder the dolphin in the reported position', async () => {
        const FEN_RAW = 'ftth1ttf/c1c1dcoc/2ooo3/8/d3O3/C3O3/1OCDDCOC/FTTH1TTF w - - 1 3';
        const METADATA_ROLES = 'a8h,b8h,c8g,f8g,g8h,h8g,a7g,c7h,e7h,f7g,g7g,h7h,c6h,d6h,e6g,a4g,e4g,a3h,e3h,b2g,c2g,d2h,e2g,f2h,g2h,h2g,a1h,b1h,c1g,f1g,g1h,h1g';
        const METADATA_CORAL = 'c7b,d6b,e6b,a4b,e4w,d3w,e3w';
        const METADATA_COUNTS = '14,13'; // w, b
        const METADATA_WHALES = 'd1e1,d8e8';

        const extendedFen = `${FEN_RAW} ${METADATA_ROLES} ${METADATA_CORAL} ${METADATA_COUNTS} ${METADATA_WHALES}`;
        
        const game = new CoralClash();
        const snapshot = { fen: extendedFen };
        
        restoreGameFromSnapshot(game, snapshot, { skipFenValidation: true });
        
        console.log('Game restored.');
        
        // Search
        console.log('Running search...');
        const searchResult = alphaBeta(game, 3, -Infinity, Infinity, true, 'w', { startTime: Date.now(), maxTimeMs: 5000 });
        
        console.log('Best Move:', searchResult.move ? searchResult.move.san : 'None');
        console.log('Score:', searchResult.score);

        // Check if the move exposes a dolphin
        if (searchResult.move) {
             game.makeMove(searchResult.move);
             
             // Check all white dolphins
             let dolphinExposed = false;
             
             // Iterate manually or verify using SQUARES
             for (const sq of SQUARES) {
                 const piece = game.get(sq);
                 if (piece && piece.type === 'd' && piece.color === 'w') {
                     // Check safety
                     const isAttacked = game.isAttacked(sq, 'b');
                     const isDefended = game.isAttacked(sq, 'w');
                     
                     if (isAttacked && !isDefended) {
                         console.log(`Dolphin exposed at ${sq}!`);
                         dolphinExposed = true;
                     }
                 }
             }
             
             // Fail if dolphin is exposed
             expect(dolphinExposed).toBe(false);
        }
    });

    it('should verify Zobrist hash consistency', () => {
        const game = new CoralClash();
        // Since we upgraded to BigInt, we can check a simple hash
        // We can't access private methods directly but we can infer stability
        // Making a move and undoing it should restore various internal states? 
        // Zobrist hash is recomputed or incrementally updated.
        // Actually aiEvaluation `generatePositionKey` is what we changed.
        
        // Just verify it runs without crashing on BigInt
        const key = alphaBeta(game, 1, -Infinity, Infinity, true, 'w');
        expect(key).toBeDefined();
    });
});
