import { isReversingMove, type LastMoveInfo } from '../v1.0.0/aiEvaluation';

describe('isReversingMove', () => {
    test('should return false when lastMove is null', () => {
        const move = { from: 'e2', to: 'e4', piece: 'd', color: 'b' };
        expect(isReversingMove(move, null)).toBe(false);
    });

    test('should identify when a move reverses player\'s own previous move', () => {
        // Scenario: Player (black) moved a dolphin from e2 to e4 on their last turn
        // Now they are evaluating moving the same dolphin from e4 back to e2
        // This SHOULD be flagged as a reversing move (same color, same piece type)
        
        const lastMove: LastMoveInfo = {
            from: 'e2',
            to: 'e4',
            piece: 'd', // dolphin
            color: 'b', // black (player's own move)
        };

        const candidateMove = {
            from: 'e4', // from where player moved to
            to: 'e2', // back to where player moved from
            piece: 'd', // same piece type
            color: 'b', // same color (player's own piece)
        };

        expect(isReversingMove(candidateMove, lastMove)).toBe(true);
    });

    test('should NOT flag move as reversing when piece colors differ', () => {
        // Scenario: Player (black) moved a black dolphin from e2 to e4
        // Now evaluating moving a white dolphin from e4 to e2
        // This should NOT be flagged as reversing (different pieces, different colors)
        
        const lastMove: LastMoveInfo = {
            from: 'e2',
            to: 'e4',
            piece: 'd',
            color: 'b', // black (player's move)
        };

        const candidateMove = {
            from: 'e4',
            to: 'e2',
            piece: 'd', // same piece type
            color: 'w', // different color - this is opponent's piece, not player's
        };

        // Should return false because colors don't match (different pieces)
        expect(isReversingMove(candidateMove, lastMove)).toBe(false);
    });

    test('should NOT flag move as reversing when piece types differ', () => {
        // Scenario: Player moved a dolphin from e2 to e4
        // Now evaluating moving a turtle from e4 to e2
        // This should NOT be flagged as reversing (different piece types)
        
        const lastMove: LastMoveInfo = {
            from: 'e2',
            to: 'e4',
            piece: 'd', // dolphin
            color: 'b',
        };

        const candidateMove = {
            from: 'e4',
            to: 'e2',
            piece: 't', // turtle - different piece type
            color: 'b',
        };

        expect(isReversingMove(candidateMove, lastMove)).toBe(false);
    });

    test('should NOT flag move as reversing when squares don\'t match', () => {
        // Scenario: Player moved from e2 to e4
        // Now evaluating moving from e4 to e3 (not back to e2)
        // This should NOT be flagged as reversing
        
        const lastMove: LastMoveInfo = {
            from: 'e2',
            to: 'e4',
            piece: 'd',
            color: 'b',
        };

        const candidateMove = {
            from: 'e4',
            to: 'e3', // different destination
            piece: 'd',
            color: 'b',
        };

        expect(isReversingMove(candidateMove, lastMove)).toBe(false);
    });

    test('should handle case-insensitive piece comparison', () => {
        // Test that piece comparison is case-insensitive
        const lastMove: LastMoveInfo = {
            from: 'e2',
            to: 'e4',
            piece: 'D', // uppercase
            color: 'b',
        };

        const candidateMove = {
            from: 'e4',
            to: 'e2',
            piece: 'd', // lowercase
            color: 'b',
        };

        expect(isReversingMove(candidateMove, lastMove)).toBe(true);
    });

    test('should verify lastMove represents player\'s own previous move', () => {
        // This test documents the expected behavior:
        // When finding the best move for playerColor, lastMove should be the player's own previous move
        // This prevents the AI from oscillating pieces back and forth
        
        // Example: If we're finding the best move for black (playerColor='b'),
        // lastMove should be black's previous move (same color)
        
        const lastMove: LastMoveInfo = {
            from: 'e2',
            to: 'e4',
            piece: 'd',
            color: 'b', // player's own move
        };

        // If player (black) moved from e2 to e4, and now evaluating
        // moving from e4 back to e2, that would be reversing their own move
        const candidateMove = {
            from: 'e4',
            to: 'e2',
            piece: 'd',
            color: 'b', // same color (player's own piece)
        };

        // This confirms: lastMove is the player's own previous move
        expect(isReversingMove(candidateMove, lastMove)).toBe(true);
    });

    test('should handle moves with missing piece property', () => {
        // Test edge case: move object might not have piece property
        const lastMove: LastMoveInfo = {
            from: 'e2',
            to: 'e4',
            piece: 'd',
            color: 'b',
        };

        const candidateMove1 = {
            from: 'e4',
            to: 'e2',
            color: 'b',
            // piece property missing
        };

        // Should return false if piece is missing (can't compare)
        expect(isReversingMove(candidateMove1, lastMove)).toBe(false);

        const candidateMove2 = {
            from: 'e4',
            to: 'e2',
            piece: undefined,
            color: 'b',
        };

        expect(isReversingMove(candidateMove2, lastMove)).toBe(false);
    });

    test('should handle moves with missing color property gracefully', () => {
        // Test that missing color doesn't break the check (backwards compatibility)
        const lastMove: LastMoveInfo = {
            from: 'e2',
            to: 'e4',
            piece: 'd',
            // color missing
        };

        const candidateMove = {
            from: 'e4',
            to: 'e2',
            piece: 'd',
            // color missing
        };

        // Should still work (colors match by default when both missing)
        expect(isReversingMove(candidateMove, lastMove)).toBe(true);

        // But if one has color and other doesn't, should still work
        const candidateMoveWithColor = {
            from: 'e4',
            to: 'e2',
            piece: 'd',
            color: 'b',
        };

        expect(isReversingMove(candidateMoveWithColor, lastMove)).toBe(true);
    });

    test('should handle different piece types correctly', () => {
        // Test various piece types to ensure comparison works
        const pieceTypes = ['d', 't', 'o', 'f', 'c', 'h'];
        
        for (const pieceType of pieceTypes) {
            const lastMove: LastMoveInfo = {
                from: 'e2',
                to: 'e4',
                piece: pieceType,
                color: 'b',
            };

            // Same piece type, same color - should be reversing
            const samePieceMove = {
                from: 'e4',
                to: 'e2',
                piece: pieceType,
                color: 'b',
            };
            expect(isReversingMove(samePieceMove, lastMove)).toBe(true);

            // Different piece type - should NOT be reversing
            const differentPieceMove = {
                from: 'e4',
                to: 'e2',
                piece: pieceType === 'd' ? 't' : 'd', // different piece
                color: 'b',
            };
            expect(isReversingMove(differentPieceMove, lastMove)).toBe(false);
        }
    });
});
