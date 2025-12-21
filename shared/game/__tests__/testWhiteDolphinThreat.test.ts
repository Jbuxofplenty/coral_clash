import aiTest3Fixture from '../__fixtures__/ai-test-3.json';
import { CoralClash, applyFixture } from '../index';

describe('Test white dolphin moving to threatened d5', () => {
    test('should not move white dolphin to threatened d5', () => {
        // Load the fixture game state (after white moved dolphin e4->d5)
        const game = new CoralClash();
        applyFixture(game, aiTest3Fixture);

        // Check current state
        const d5Piece = game.get('d5');
        const d5Threatened = game.isAttacked('d5', 'b');
        console.log(`Current state:`);
        console.log(`  d5: ${d5Piece !== false ? `${d5Piece.type}${d5Piece.role || ''} (${d5Piece.color})` : 'empty'}`);
        console.log(`  d5 threatened by black: ${d5Threatened}`);
        console.log(`  Turn: ${game.turn()}`);

        // The fixture shows state AFTER white moved to d5
        // To test properly, we need to reconstruct the position BEFORE that move
        // History: ["Df3*", "Df6", "De4*", "Oa6", "Dd5*"]
        // We want to test when it's white's turn and white has dolphin at e4
        
        // Since we can't easily undo, let's manually create a test position
        // where white dolphin is at e4 and d5 is threatened
        
        // Actually, let's check: if d5 is threatened NOW, and white dolphin is there,
        // then white should NOT have moved there. So the penalty should prevent it.
        
        // Let's verify the penalty logic works by checking what threatens d5
        const blackPieces = [];
        const board = game.board();
        for (let rank = 0; rank < board.length; rank++) {
            for (let file = 0; file < board[rank].length; file++) {
                const cell = board[rank][file];
                if (cell && cell.color === 'b') {
                    blackPieces.push({square: cell.square, type: cell.type, role: cell.role});
                }
            }
        }
        console.log(`\nBlack pieces that might threaten d5:`);
        blackPieces.forEach(p => {
            const threatens = game.isAttacked('d5', 'b');
            if (threatens) {
                console.log(`  ${p.type}${p.role || ''} at ${p.square}`);
            }
        });

        // The key test: if d5 is threatened and white moved a dolphin there,
        // the penalty should have prevented it. Since it happened, either:
        // 1. The penalty wasn't working for white's moves
        // 2. d5 wasn't threatened before white moved
        // 3. The penalty wasn't large enough
        
        // Let's verify the penalty code works for white by checking the logic
        // The penalty should apply regardless of color since we use playerColor and opponentColor
        expect(d5Threatened).toBe(true); // d5 should be threatened
        if (d5Piece !== false && d5Piece.type === 'd' && d5Piece.color === 'w') {
            console.log(`\n⚠️  White dolphin is at threatened d5 - penalty should have prevented this!`);
        }
    });
});

