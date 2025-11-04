/**
 * Why can't white attack e4 specifically?
 */

import whaleCheck from '../__fixtures__/whale-check.json';
import { CoralClash, applyFixture } from '../index';

describe('Why not e4?', () => {
    test('check if white moving to e4 would put white in check', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck);

        console.log('\n=== Initial state ===');
        console.log('White whale:', game.whalePositions().w); // b4, c4
        console.log('Black whale:', game.whalePositions().b); // e3, e2

        console.log('\n=== Can white attack e4 (with validation)? ===');
        console.log('Result:', game.isAttacked('e4', 'w'));

        const gameInternal = game as any;
        function squareToIndex(sq: string): number {
            const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
            const rank = 8 - parseInt(sq[1]);
            return rank * 16 + file;
        }

        const e4 = squareToIndex('e4');

        console.log('\n=== Can white attack e4 (skip validation)? ===');
        console.log('Result:', gameInternal._attacked('w', e4, true));

        // Simulate: if white whale moved from b4,c4 to d4,e4, would white be in check?
        console.log('\n=== Simulate white move to (d4,e4) ===');
        const oldWhiteKings = [gameInternal._kings.w[0], gameInternal._kings.w[1]];

        const d4 = squareToIndex('d4');
        gameInternal._kings.w[0] = d4;
        gameInternal._kings.w[1] = e4;

        console.log('White whale moved to:', [d4, e4]);
        const wouldBeInCheck = gameInternal._isKingAttacked('w');
        console.log('Would white be in check?', wouldBeInCheck);

        // Check if black can attack d4 or e4
        console.log('Can black attack d4?', gameInternal._attacked('b', d4, true));
        console.log('Can black attack e4?', gameInternal._attacked('b', e4, true));

        // Restore
        gameInternal._kings.w[0] = oldWhiteKings[0];
        gameInternal._kings.w[1] = oldWhiteKings[1];

        console.log('\n=== What about (c4,e4)? ===');
        const c4 = squareToIndex('c4');
        gameInternal._kings.w[0] = c4;
        gameInternal._kings.w[1] = e4;

        const wouldBeInCheck2 = gameInternal._isKingAttacked('w');
        console.log('White whale at c4,e4');
        console.log('Would white be in check?', wouldBeInCheck2);
        console.log('Can black attack c4?', gameInternal._attacked('b', c4, true));
        console.log('Can black attack e4?', gameInternal._attacked('b', e4, true));

        // Restore
        gameInternal._kings.w[0] = oldWhiteKings[0];
        gameInternal._kings.w[1] = oldWhiteKings[1];
    });
});
