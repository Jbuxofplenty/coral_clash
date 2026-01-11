import { evaluatePosition, findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';
import { CoralClash } from '../v1.0.0/coralClash';
import { createGameSnapshot } from '../v1.0.0/gameState';

describe('AI Freeze Reproduction', () => {
    // Increase timeout significantly
    jest.setTimeout(30000);

    it('should not hang in reported freeze position', () => {
        const fen = '6tf/c3h1oc/1T1c4/4FT2/8/7O/C1TH3C/8 b - - 0 25 g8h,h8g,a7g,g7g,h7h,b6h,d6h,e5h,f5h,h3h,a2h,c2g,h2g c7b,f6w,d5w,e5w,c4w,e4b,g4w,d3w,e3w,c2b,d2w 9,14 d2d1,e7f7';
        const game = new CoralClash(fen);
        const maxTimeMs = 5000;
        
        console.log(`Starting search for FEN: ${fen}`);

        const result = findBestMoveIterativeDeepening(
            createGameSnapshot(game),
            4, // Start with smaller depth to see if it even completes
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
        const startEval = Date.now();
        const evalCount = 1000;
        const snapshot = createGameSnapshot(game);
        for (let i = 0; i < evalCount; i++) {
            evaluatePosition(snapshot, 'b');
        }
        const evalTime = Date.now() - startEval;
        console.log(`${evalCount} evaluations took ${evalTime}ms (${evalTime/evalCount}ms/op)`);

        const startMoves = Date.now();
        const moveGenCount = 1000;
        for (let i = 0; i < moveGenCount; i++) {
            game.internalMoves();
        }
        const moveTime = Date.now() - startMoves;
        console.log(`${moveGenCount} move generations took ${moveTime}ms (${moveTime/moveGenCount}ms/op)`);

        // Benchmark makeMove/undo
        const moves = game.internalMoves();
        if (moves.length > 0) {
            const move = moves[0];
            const startMakeUndo = Date.now();
            const makeUndoCount = 1000;
            for (let i = 0; i < makeUndoCount; i++) {
                game.makeMove(move);
                game.undoInternal();
            }
            const makeUndoTime = Date.now() - startMakeUndo;
            console.log(`${makeUndoCount} makeMove/undoInternal took ${makeUndoTime}ms (${makeUndoTime/makeUndoCount}ms/op)`);
            
            // Benchmark eval inside loop (to see if state change affects perf)
            const startEvalLoop = Date.now();
            for (let i = 0; i < 1000; i++) {
                game.makeMove(move);
                evaluatePosition(createGameSnapshot(game), 'b');
                game.undoInternal();
            }
            const evalLoopTime = Date.now() - startEvalLoop;
            console.log(`1000 eval in loop took ${evalLoopTime}ms (${evalLoopTime/1000}ms/op)`);
        }
        
        // Benchmark Zobrist hashing (accessed via private method usually, but let's try to access public if possible or just infer)
        // We can't access private methods easily, but we can measure alphaBeta overhead by running shallow search
        // Or we can try to call generatePositionKey if it was exported.
        // It is not exported. But internalMoves calls logic.
        
        const startMovesVerbose = Date.now();
        const moveGenCountVerbose = 100;
        for (let i = 0; i < moveGenCountVerbose; i++) {
            game.moves({ verbose: true });
        }
        const moveVerboseTime = Date.now() - startMovesVerbose;
        console.log(`${moveGenCountVerbose} verbose move generations took ${moveVerboseTime}ms (${moveVerboseTime/moveGenCountVerbose}ms/op)`);
    });
});
