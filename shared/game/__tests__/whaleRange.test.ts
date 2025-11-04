/**
 * Test whale's attack range after the fix
 */

import whaleCheck from '../__fixtures__/whale-check.json';
import { CoralClash, applyFixture } from '../index';

describe('Test Whale Range After Fix', () => {
    test('check which squares white whale can now attack', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck);

        console.log('\n=== White whale at b4,c4 ===');
        console.log('Coral at c4:', game.getCoral('c4'));

        // Check all squares in the c4->e4 path
        const squares = ['c4', 'd4', 'e4', 'f4', 'g4', 'h4'];

        console.log('\n=== Can white attack these squares? ===');
        squares.forEach((sq) => {
            console.log(`${sq}: ${game.isAttacked(sq as any, 'w')}`);
        });

        // Also check vertical from b4
        const verticalSquares = ['b5', 'b6', 'b7', 'b8'];
        console.log('\n=== Vertical from b4 ===');
        verticalSquares.forEach((sq) => {
            console.log(`${sq}: ${game.isAttacked(sq as any, 'w')}`);
        });

        // Check horizontal from b4
        const horizontalFromB4 = ['a4', 'c4', 'd4', 'e4'];
        console.log('\n=== Horizontal from b4 (through c4) ===');
        horizontalFromB4.forEach((sq) => {
            console.log(`${sq}: ${game.isAttacked(sq as any, 'w')}`);
        });
    });
});
