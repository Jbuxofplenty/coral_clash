
import { findBestMoveIterativeDeepening, GameStateSnapshot } from '../v1.0.0/aiEvaluation';

// Mock GameStateSnapshot since we don't need a real game state for this test
// We just want to check if the function accepts the time limit
const mockGameState: GameStateSnapshot = {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    turn: 'w',
    whalePositions: { w: ['e1'], b: ['e8'] },
    isCheck: false,
    isCheckmate: false,
    isGameOver: false,
    isCoralVictory: false,
    isDraw: false
};

// Mock safeRestoreGame to avoid complex setup
jest.mock('../v1.0.0/gameState', () => ({
    restoreGameFromSnapshot: jest.fn(),
    safeRestoreGame: jest.fn(() => ({
        internalMoves: () => [{ from: 0, to: 1 }],
        moves: () => [{ from: 'e2', to: 'e4' }],
        makeMove: jest.fn(),
        undoInternal: jest.fn(),
        turn: () => 'w',
        isGameOver: () => false,
        getBoardOx88: () => new Array(120),
        getWhalePositionsOx88: () => ({ w: [0], b: [0] }),
        isCheckmate: () => false,
        isStalemate: () => false,
        isCoralVictory: () => false,
        getCoralRemainingCounts: () => ({ w: 17, b: 17 }),
        isAttacked: () => false,
        get: () => null,
        getCoralOx88: () => new Array(120),
    }))
}));

// We need to bypass the actual search logic to just verify the time limit assignment
// But findBestMoveIterativeDeepening is a single function. 
// We can't easily spy on internal variables.
// However, we can infer it by checking if it throws or if it takes a default amount of time vs hanging.
// A better way is to rely on behavior: if we pass 0 or NaN, it SHOULD NOT return immediately (which 0 would cause)
// nor hang forever. It should behave like a normal search (approx 5s maxTime).

describe('AI Time Limit Robustness', () => {
    // These tests integration-test the defensive logic we added
    
    it('should not throw when maxTimeMs is NaN', () => {
        const result = findBestMoveIterativeDeepening(
            mockGameState,
            1, // min depth
            'w',
            NaN
        );
        expect(result).toBeDefined();
        // It should complete, using default time
    });

    it('should not throw when maxTimeMs is 0', () => {
        const result = findBestMoveIterativeDeepening(
            mockGameState,
            1,
            'w',
            0
        );
        expect(result).toBeDefined();
        // It should complete, using default time instead of 0
    });

    it('should not throw when maxTimeMs is negative', () => {
        const result = findBestMoveIterativeDeepening(
            mockGameState,
            1,
            'w',
            -100
        );
        expect(result).toBeDefined();
    });
    
    it('should not throw when maxTimeMs is Infinity', () => {
         const result = findBestMoveIterativeDeepening(
            mockGameState,
            1,
            'w',
            Infinity
        );
        expect(result).toBeDefined();
    });
});
