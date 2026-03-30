import { CoralClash } from '../index';

describe('CoralClash Zobrist Hashing Optimization', () => {
    let game: CoralClash;

    beforeEach(() => {
        game = new CoralClash();
    });

    test('Initial board state hash matches O(64) verification hash', () => {
        expect(game.currentHash).toEqual(game.verifyHash());
        // Verify it's actually initialized to a non-zero bigint
        expect(game.currentHash).not.toEqual(0n);
    });

    test('Hash correctly updates across a sequence of standard moves', () => {
        const initialHash = game.currentHash;

        // Perform a few basic moves
        const m1 = game.moves({ verbose: true })[0];
        game.move(m1);
        const hashAfterMove1 = game.currentHash;
        expect(hashAfterMove1).toEqual(game.verifyHash());
        expect(hashAfterMove1).not.toEqual(initialHash); // Should change

        const m2 = game.moves({ verbose: true })[0];
        game.move(m2);
        const hashAfterMove2 = game.currentHash;
        expect(hashAfterMove2).toEqual(game.verifyHash());
        expect(hashAfterMove2).not.toEqual(hashAfterMove1);

        const m3 = game.moves({ verbose: true })[0];
        game.move(m3);
        expect(game.currentHash).toEqual(game.verifyHash());
    });

    test('Undo operation perfectly restores previous hash states', () => {
        const hashes: bigint[] = [];

        // Save initial hash
        hashes.push(game.currentHash);

        // Make several moves and store their hashes
        for (let i = 0; i < 6; i++) {
            const m = game.moves({ verbose: true })[0];
            game.move(m);
            expect(game.currentHash).toEqual(game.verifyHash());
            hashes.push(game.currentHash);
        }

        // Now undo every move and verify the hash perfectly backtracks
        for (let i = hashes.length - 2; i >= 0; i--) {
            game.undo();
            expect(game.currentHash).toEqual(hashes[i]);
            expect(game.currentHash).toEqual(game.verifyHash());
        }
    });

    test('Whale multi-square movement maintains correct hash state', () => {
        // Clear board and set up a customized simple scenario with a Whale
        game.clear();
        game.put({ type: 'h', color: 'w' }, 'd1'); // White Whale at d1-e1
        game.put({ type: 'h', color: 'b' }, 'd8'); // Black Whale at d8-e8
        
        // When using clear/put, we explicitly need to tell the engine to recalculate the hash 
        // because put() skips the heavy hash update. We just use load() trick or verifyHash.
        game['_currentHash'] = game.verifyHash();
        
        const hashBeforeWhaleMove = game.currentHash;
        expect(hashBeforeWhaleMove).toEqual(game.verifyHash());

        // Rotate the White Whale
        const wMoves = game.moves({ verbose: true }).filter(m => m.piece === 'h');
        const wMove = wMoves[0];
        game.move(wMove);
        
        const hashAfterWhaleMove = game.currentHash;
        expect(hashAfterWhaleMove).toEqual(game.verifyHash());
        expect(hashAfterWhaleMove).not.toEqual(hashBeforeWhaleMove);

        // Undo internal Whale Move
        game.undo();
        expect(game.currentHash).toEqual(hashBeforeWhaleMove);
    });

    test('Captures correctly update the hash state', () => {
        let moves = game.moves({ verbose: true });
        let captureMove = moves.find(m => m.captured);
        
        // Play pseudo-random moves until a capture is available
        let safety = 0;
        while (!captureMove && moves.length > 0 && safety < 100) {
            game.move(moves[Math.floor(moves.length / 2)]); // Pick middle move
            moves = game.moves({ verbose: true });
            captureMove = moves.find(m => m.captured);
            safety++;
        }

        expect(captureMove).toBeDefined();

        const beforeCaptureHash = game.currentHash;

        if (captureMove) {
            game.move(captureMove);
        }
        
        const afterCaptureHash = game.currentHash;
        
        expect(afterCaptureHash).toEqual(game.verifyHash());
        expect(afterCaptureHash).not.toEqual(beforeCaptureHash);

        // Revert capture
        game.undo();
        expect(game.currentHash).toEqual(beforeCaptureHash);
    });

    test('Coral Placement correctly updates the hash state', () => {
        let moves = game.moves({ verbose: true });
        let coralMove = moves.find(m => m.coralPlaced);
        
        // Play pseudo-random moves until coral placement is available
        let safety = 0;
        while (!coralMove && moves.length > 0 && safety < 100) {
            // Find a move that isn't placing coral to advance the board state
            const normalMove = moves.find(m => !m.coralPlaced);
            if (normalMove) {
                game.move(normalMove);
            } else {
                game.move(moves[0]);
            }
            moves = game.moves({ verbose: true });
            coralMove = moves.find(m => m.coralPlaced);
            safety++;
        }

        expect(coralMove).toBeDefined();

        const beforeCoralHash = game.currentHash;

        if (coralMove) {
            game.move(coralMove);
        }

        const afterCoralHash = game.currentHash;
        expect(afterCoralHash).toEqual(game.verifyHash());
        expect(afterCoralHash).not.toEqual(beforeCoralHash);
        
        game.undo();
        expect(game.currentHash).toEqual(beforeCoralHash);
    });
});
