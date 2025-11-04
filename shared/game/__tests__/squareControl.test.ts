/**
 * Test if white controls e4 square (ignoring occupation)
 */

import whaleCheck from '../__fixtures__/whale-check.json';
import { CoralClash, applyFixture } from '../index';

describe('Test Square Control', () => {
    test('can white attack e4 if black whale were not there?', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck);

        console.log('\n=== Before black moves ===');
        console.log('White whale:', game.whalePositions().w); // b4, c4
        console.log('Black whale:', game.whalePositions().b); // e3, e2

        // Can white attack e4 right now (when it's empty)?
        console.log('Can white attack e4 (empty)?', game.isAttacked('e4', 'w'));

        // Now move black to e3,e4
        game.move({ from: 'e2', to: 'e4', whaleSecondSquare: 'e3' });

        console.log('\n=== After black moves to e3,e4 ===');
        console.log('Black whale:', game.whalePositions().b); // e4, e3

        // Can white attack e4 now (occupied by black)?
        console.log('Can white attack e4 (occupied)?', game.isAttacked('e4', 'w'));

        // The key question: In chess terms, does white "control" e4?
        // This means: could white attack e4 if the piece there were removed?

        // Let's test by temporarily removing black whale and checking
        const gameInternal = game as any;

        function squareToIndex(sq: string): number {
            const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
            const rank = 8 - parseInt(sq[1]);
            return rank * 16 + file;
        }

        const e4 = squareToIndex('e4');
        const e3 = squareToIndex('e3');

        // Save black whale position
        const oldBlackKings = [gameInternal._kings.b[0], gameInternal._kings.b[1]];
        const oldE4Piece = gameInternal._board[e4];
        const oldE3Piece = gameInternal._board[e3];

        // Temporarily remove black whale
        gameInternal._kings.b[0] = -1;
        gameInternal._kings.b[1] = -1;
        gameInternal._board[e4] = undefined;
        gameInternal._board[e3] = undefined;

        console.log('\n=== With black whale temporarily removed ===');
        console.log('Can white attack e4 now?', gameInternal._attacked('w', e4, false));
        console.log('Can white attack e4 (skip)?', gameInternal._attacked('w', e4, true));

        // Restore black whale
        gameInternal._kings.b[0] = oldBlackKings[0];
        gameInternal._kings.b[1] = oldBlackKings[1];
        gameInternal._board[e4] = oldE4Piece;
        gameInternal._board[e3] = oldE3Piece;

        console.log('\n=== Restored ===');
        console.log('Can white attack e4?', gameInternal._attacked('w', e4, false));
    });
});
