/**
 * Trace exactly what's blocking white whale from attacking e4
 */

import whaleCheck from '../__fixtures__/whale-check.json';
import { CoralClash, applyFixture } from '../index';

describe('Trace Attack Blocking', () => {
    test('detailed trace of why white cannot attack e4', () => {
        const game = new CoralClash();
        applyFixture(game, whaleCheck);

        const gameInternal = game as any;

        function squareToIndex(sq: string): number {
            const file = sq.charCodeAt(0) - 'a'.charCodeAt(0);
            const rank = 8 - parseInt(sq[1]);
            return rank * 16 + file;
        }

        const b4 = squareToIndex('b4');
        const c4 = squareToIndex('c4');
        const d4 = squareToIndex('d4');
        const e4 = squareToIndex('e4');

        console.log('\n=== Board Setup ===');
        console.log('White whale positions:', game.whalePositions().w); // b4, c4
        console.log('_kings.w:', gameInternal._kings.w);
        console.log('Piece in _board[b4]:', gameInternal._board[b4]);
        console.log('Piece in _board[c4]:', gameInternal._board[c4]);

        console.log('\n=== Path from b4 to e4 ===');
        console.log('b4 = 0x' + b4.toString(16) + ' (' + b4 + ')');
        console.log('c4 = 0x' + c4.toString(16) + ' (' + c4 + ')');
        console.log('d4 = 0x' + d4.toString(16) + ' (' + d4 + ')');
        console.log('e4 = 0x' + e4.toString(16) + ' (' + e4 + ')');

        console.log('\n=== Offset calculation ===');
        const diff_b4_to_e4 = b4 - e4;
        console.log('b4 - e4 =', diff_b4_to_e4);
        console.log('Index in ATTACKS array:', diff_b4_to_e4 + 119);

        // Check the RAY (RAYS not directly accessible from outside the class)
        console.log('RAYS not directly accessible, but offset should be 1 for horizontal');

        const offset = 1; // Horizontal right
        console.log('Offset for horizontal movement:', offset);

        console.log('\n=== Checking path squares ===');
        let current = b4;
        let step = 0;
        while (current !== e4) {
            current += offset;
            step++;
            const isOccupied = gameInternal._isSquareOccupied(current);
            const hasCoral = gameInternal._coral[current];
            const whaleSquares = gameInternal._kings.w;
            const isWhaleSquare = whaleSquares.includes(current);

            console.log(`Step ${step}: Square 0x${current.toString(16)}`);
            console.log(`  Occupied: ${isOccupied}`);
            console.log(`  Coral: ${hasCoral}`);
            console.log(`  Is whale's own square: ${isWhaleSquare}`);

            if (current === e4) break;

            if (isOccupied) {
                console.log(`  -> BLOCKED by occupation!`);
                break;
            }

            if (hasCoral && !isWhaleSquare) {
                console.log(`  -> BLOCKED by coral!`);
                break;
            }
        }

        console.log('\n=== The Problem ===');
        console.log('The whale is stored in _board at b4');
        console.log('When checking if it can attack e4, it checks from b4');
        console.log('The path is: b4 -> c4 -> d4 -> e4');
        console.log("c4 is the whale's own second square, which blocks the path!");

        console.log('\n=== What about checking from c4? ===');
        console.log('The _attacked function only checks from squares in _board');
        console.log('c4 is not in _board (only b4 is), so attacks from c4 are not checked');

        console.log('\n=== Testing attack from c4 directly ===');
        const diff_c4_to_e4 = c4 - e4;
        console.log('c4 - e4 =', diff_c4_to_e4);
        console.log('This would be 2 squares away');

        let currentFromC4 = c4;
        let stepFromC4 = 0;
        console.log('Path from c4 to e4:');
        while (currentFromC4 !== e4) {
            currentFromC4 += offset;
            stepFromC4++;
            const isOccupied = gameInternal._isSquareOccupied(currentFromC4);

            console.log(`Step ${stepFromC4}: Square 0x${currentFromC4.toString(16)}`);
            console.log(`  Occupied: ${isOccupied}`);

            if (currentFromC4 === e4) break;
            if (isOccupied) {
                console.log(`  -> BLOCKED!`);
                break;
            }
        }
    });
});
