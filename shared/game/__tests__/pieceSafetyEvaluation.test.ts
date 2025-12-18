import { CoralClash, createGameSnapshot } from '../index';
import { evaluatePosition } from '../v1.0.0/aiEvaluation';
import { getPieceValue } from '../v1.0.0/aiConfig';

describe('Piece Safety Evaluation', () => {
    let game: CoralClash;

    beforeEach(() => {
        game = new CoralClash();
    });

    test('should heavily penalize hanging valuable pieces', () => {
        // Setup: Start with a fresh game (has valid starting position with whales)
        // Then place a valuable piece that is attacked but not defended
        game.clear();
        game.put({ type: 'h', color: 'w' }, 'd1');
        game.put({ type: 'h', color: 'b' }, 'd8');
        
        // White dolphin gatherer at e4, attacked by black piece but not defended
        game.put({ type: 'd', color: 'w', role: 'gatherer' }, 'e4');
        game.put({ type: 't', color: 'b', role: 'hunter' }, 'e6'); // Can attack e4
        
        const gameState = createGameSnapshot(game);
        const score = evaluatePosition(gameState, 'w');
        
        // Should have heavy penalty for hanging dolphin gatherer
        const dolphinValue = getPieceValue('d', 'gatherer');
        const expectedPenalty = dolphinValue * 1.2; // criticalHangingMultiplier (1800 * 1.2 = 2160)
        
        // Score should be significantly negative due to hanging piece penalty
        expect(score).toBeLessThan(dolphinValue - expectedPenalty);
        expect(score).toBeLessThan(0); // Should be negative
    });

    test('should penalize less for defended pieces under attack', () => {
        // Setup: Place a valuable piece that is attacked but defended
        game.clear();
        game.put({ type: 'h', color: 'w' }, 'd1');
        game.put({ type: 'h', color: 'b' }, 'd8');
        
        // White dolphin gatherer at e4, attacked by black but defended by white
        game.put({ type: 'd', color: 'w', role: 'gatherer' }, 'e4');
        game.put({ type: 't', color: 'b', role: 'hunter' }, 'e6'); // Can attack e4
        game.put({ type: 't', color: 'w', role: 'hunter' }, 'e2'); // Can defend e4
        
        const gameState = createGameSnapshot(game);
        const score = evaluatePosition(gameState, 'w');
        
        // Should have smaller penalty for defended piece
        const dolphinValue = getPieceValue('d', 'gatherer');
        // Net penalty: attackedMultiplier (0.25) - defendedBonus (0.05) = 0.20
        const expectedNetPenalty = dolphinValue * 0.20;
        
        // Score should be less negative than hanging piece
        expect(score).toBeGreaterThan(dolphinValue - expectedNetPenalty * 2);
    });


    test('should apply correct penalties for different piece values', () => {
        game.clear();
        
        const testCases = [
            { piece: 'd' as const, role: 'gatherer' as const, value: 1800 }, // Critical piece
            { piece: 't' as const, role: 'gatherer' as const, value: 1000 }, // Regular piece
            { piece: 'f' as const, role: 'gatherer' as const, value: 600 }, // Lower value
        ];
        
        for (const testCase of testCases) {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1');
            game.put({ type: 'h', color: 'b' }, 'd8');
            
            // Place piece that will be hanging
            game.put({ type: testCase.piece, color: 'w', role: testCase.role }, 'e4');
            game.put({ type: 't', color: 'b', role: 'hunter' }, 'e6'); // Attacker
            
            const gameState = createGameSnapshot(game);
            const score = evaluatePosition(gameState, 'w');
            
            // Calculate expected penalty
            let expectedPenalty;
            if (testCase.value >= 1500) {
                // Critical piece - uses criticalHangingMultiplier
                expectedPenalty = testCase.value * 1.2;
            } else {
                // Regular piece - uses hangingMultiplier
                expectedPenalty = testCase.value * 0.75;
            }
            
            // Score should reflect the penalty
            // (material value - hanging penalty)
            expect(score).toBeLessThan(testCase.value - expectedPenalty * 0.9); // At least 90% of penalty
        }
    });
});

