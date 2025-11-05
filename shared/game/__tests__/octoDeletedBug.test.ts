import octoDeleted from '../__fixtures__/octo-deleted.json';
import { CoralClash } from '../v1.0.0/coralClash';
import { applyFixture, createGameSnapshot, restoreGameFromSnapshot } from '../v1.0.0/gameState';

describe('Octopus Deleted Bug (Regression)', () => {
    test('octo-deleted.json: black octopus at e6 should not disappear after c7->c6 move', () => {
        const game = new CoralClash();
        applyFixture(game, octoDeleted);

        // Verify initial state
        expect(game.turn()).toBe('b');

        const initialBoard = game.board();
        const allPiecesBefore = initialBoard.flat().filter((sq) => sq !== null);
        const octopusesBefore = allPiecesBefore.filter(
            (sq) => sq?.type === 'o' && sq?.color === 'b',
        );
        console.log(
            '[TEST] Octopuses before move:',
            octopusesBefore.map((p) => p?.square),
        );

        // Fixture has 4 black octopuses: a6, d6, e6, h6
        expect(octopusesBefore.length).toBe(4);

        // Make the EXACT move the user is making: c7->c6
        const result = game.move({ from: 'c7', to: 'c6' });
        expect(result).not.toBeNull();
        console.log('[TEST] Made move c7->c6:', result.san);

        // Check the board after the move
        const afterMoveBoard = game.board();
        const allPiecesAfter = afterMoveBoard.flat().filter((sq) => sq !== null);
        const octopusesAfter = allPiecesAfter.filter((sq) => sq?.type === 'o' && sq?.color === 'b');
        console.log(
            '[TEST] Octopuses after move:',
            octopusesAfter.map((p) => p?.square),
        );

        // CRITICAL: Should still have 4 black octopuses (none should disappear!)
        expect(octopusesAfter.length).toBe(4);

        // CRITICAL: Check that each octopus is at its correct location
        const octopusLocations = octopusesAfter.map((p) => p?.square).sort();
        expect(octopusLocations).toEqual(['a6', 'd6', 'e6', 'h6']);
    });

    test('octo-deleted.json: verify board state integrity after ANY black move', () => {
        const game = new CoralClash();
        applyFixture(game, octoDeleted);

        const initialBoard = game.board();
        const allPiecesBefore = initialBoard.flat().filter((sq) => sq !== null);
        const octopusesBefore = allPiecesBefore.filter(
            (sq) => sq?.type === 'o' && sq?.color === 'b',
        );

        expect(octopusesBefore.length).toBe(4); // a6, d6, e6, h6

        // Try multiple different black moves to ensure consistency
        const testMoves = [
            { from: 'c7', to: 'c6' },
            { from: 'c7', to: 'b7' },
            { from: 'b8', to: 'b7' },
        ];

        for (const moveInput of testMoves) {
            // Reset to initial state
            game.load(game.fen());
            applyFixture(game, octoDeleted);

            // Make the move
            const result = game.move(moveInput);
            if (!result) continue; // Skip illegal moves

            console.log('[TEST] Testing move:', result.san);

            // Check board integrity
            const afterMoveBoard = game.board();
            const allPiecesAfter = afterMoveBoard.flat().filter((sq) => sq !== null);
            const octopusesAfter = allPiecesAfter.filter(
                (sq) => sq?.type === 'o' && sq?.color === 'b',
            );

            // See if undo/redo moves works properly
            const history = game.history({ verbose: true });
            console.log('[TEST] History:', history);
            expect(history.length).toBe(1);

            // CRITICAL: All 4 octopuses should still exist
            expect(octopusesAfter.length).toBe(4);

            // CRITICAL: All octopuses should be at their correct locations
            const octopusLocations = octopusesAfter.map((p) => p?.square).sort();
            expect(octopusLocations).toEqual(['a6', 'd6', 'e6', 'h6']);
        }
    });

    test('octo-deleted.json: createGameSnapshot and restoreGameFromSnapshot should not corrupt board', () => {
        const game = new CoralClash();
        applyFixture(game, octoDeleted);

        // Verify initial state
        const initialBoard = game.board();
        const initialOctopuses = initialBoard
            .flat()
            .filter((sq) => sq?.type === 'o' && sq?.color === 'b');
        console.log(
            '[TEST] Initial black octopuses:',
            initialOctopuses.map((p) => p?.square),
        );
        expect(initialOctopuses.length).toBe(4);
        expect(initialOctopuses.map((p) => p?.square).sort()).toEqual(['a6', 'd6', 'e6', 'h6']);

        // Create a snapshot
        const snapshot = createGameSnapshot(game);
        console.log('[TEST] Snapshot created');

        // Check board state AFTER creating snapshot
        const boardAfterSnapshot = game.board();
        const octopusesAfterSnapshot = boardAfterSnapshot
            .flat()
            .filter((sq) => sq?.type === 'o' && sq?.color === 'b');
        console.log(
            '[TEST] After createGameSnapshot - black octopuses:',
            octopusesAfterSnapshot.map((p) => p?.square),
        );
        expect(octopusesAfterSnapshot.length).toBe(4);
        expect(octopusesAfterSnapshot.map((p) => p?.square).sort()).toEqual([
            'a6',
            'd6',
            'e6',
            'h6',
        ]);

        // Create a new game instance and restore from snapshot
        const restoredGame = new CoralClash();
        restoreGameFromSnapshot(restoredGame, snapshot);
        console.log('[TEST] Snapshot restored to new game instance');

        // Check board state AFTER restoring
        const restoredBoard = restoredGame.board();
        const restoredOctopuses = restoredBoard
            .flat()
            .filter((sq) => sq?.type === 'o' && sq?.color === 'b');
        console.log(
            '[TEST] After restoreGameFromSnapshot - black octopuses:',
            restoredOctopuses.map((p) => p?.square),
        );
        expect(restoredOctopuses.length).toBe(4);
        expect(restoredOctopuses.map((p) => p?.square).sort()).toEqual(['a6', 'd6', 'e6', 'h6']);

        // Also check the original game wasn't corrupted
        const originalAfterRestore = game.board();
        const originalOctopusesAfterRestore = originalAfterRestore
            .flat()
            .filter((sq) => sq?.type === 'o' && sq?.color === 'b');
        console.log(
            '[TEST] Original game after restore - black octopuses:',
            originalOctopusesAfterRestore.map((p) => p?.square),
        );
        expect(originalOctopusesAfterRestore.length).toBe(4);
        expect(originalOctopusesAfterRestore.map((p) => p?.square).sort()).toEqual([
            'a6',
            'd6',
            'e6',
            'h6',
        ]);
    });

    test('octo-deleted.json: createGameSnapshot should not corrupt board after move', () => {
        const game = new CoralClash();
        applyFixture(game, octoDeleted);

        // Make a move (c7->c6)
        const result = game.move({ from: 'c7', to: 'c6' });
        expect(result).not.toBeNull();
        console.log('[TEST] Made move:', result.san);

        // Check board state BEFORE createGameSnapshot
        const boardBeforeSnapshot = game.board();
        const octopusesBeforeSnapshot = boardBeforeSnapshot
            .flat()
            .filter((sq) => sq?.type === 'o' && sq?.color === 'b');
        console.log(
            '[TEST] BEFORE createGameSnapshot - black octopuses:',
            octopusesBeforeSnapshot.map((p) => p?.square),
        );
        expect(octopusesBeforeSnapshot.length).toBe(4);
        expect(octopusesBeforeSnapshot.map((p) => p?.square).sort()).toEqual([
            'a6',
            'd6',
            'e6',
            'h6',
        ]);

        // Call createGameSnapshot (this is what the UI does!)
        createGameSnapshot(game);
        console.log('[TEST] createGameSnapshot called');

        // Check board state AFTER createGameSnapshot
        const boardAfterSnapshot = game.board();
        const octopusesAfterSnapshot = boardAfterSnapshot
            .flat()
            .filter((sq) => sq?.type === 'o' && sq?.color === 'b');
        console.log(
            '[TEST] AFTER createGameSnapshot - black octopuses:',
            octopusesAfterSnapshot.map((p) => p?.square),
        );

        // CRITICAL: createGameSnapshot should NOT corrupt the board!
        expect(octopusesAfterSnapshot.length).toBe(4);
        expect(octopusesAfterSnapshot.map((p) => p?.square).sort()).toEqual([
            'a6',
            'd6',
            'e6',
            'h6',
        ]);
    });

    test('octo-deleted.json: pgn() should not corrupt board after move', () => {
        const game = new CoralClash();
        applyFixture(game, octoDeleted);

        // Check how many moves are in history after loading fixture
        const historyAfterLoad = game.history({ verbose: true });
        console.log('[TEST] History after loading fixture:', historyAfterLoad.length, 'moves');

        // Make a move (c7->c6)
        const result = game.move({ from: 'c7', to: 'c6' });
        expect(result).not.toBeNull();
        console.log('[TEST] Made move:', result.san);

        // Check history after making a move
        const historyAfterMove = game.history({ verbose: true });
        console.log('[TEST] History after making move:', historyAfterMove.length, 'moves');

        // Check board state BEFORE pgn()
        const boardBeforePgn = game.board();
        const octopusesBeforePgn = boardBeforePgn
            .flat()
            .filter((sq) => sq?.type === 'o' && sq?.color === 'b');
        console.log(
            '[TEST] BEFORE pgn() - black octopuses:',
            octopusesBeforePgn.map((p) => p?.square),
        );
        expect(octopusesBeforePgn.length).toBe(4);

        // Call pgn() - this is what createGameSnapshot calls internally!
        const pgn = game.pgn();
        console.log('[TEST] pgn() called, result length:', pgn.length);

        // Check board state AFTER pgn()
        const boardAfterPgn = game.board();
        const octopusesAfterPgn = boardAfterPgn
            .flat()
            .filter((sq) => sq?.type === 'o' && sq?.color === 'b');
        console.log(
            '[TEST] AFTER pgn() - black octopuses:',
            octopusesAfterPgn.map((p) => p?.square),
        );

        // CRITICAL: pgn() should NOT corrupt the board!
        expect(octopusesAfterPgn.length).toBe(4);
        expect(octopusesAfterPgn.map((p) => p?.square).sort()).toEqual(['a6', 'd6', 'e6', 'h6']);
    });

    test('octo-deleted.json: history() should not corrupt board state', () => {
        const game = new CoralClash();
        applyFixture(game, octoDeleted);

        // Verify initial state
        const initialBoard = game.board();
        const initialOctopuses = initialBoard
            .flat()
            .filter((sq) => sq?.type === 'o' && sq?.color === 'b');
        console.log(
            '[TEST] Initial black octopuses:',
            initialOctopuses.map((p) => p?.square),
        );
        expect(initialOctopuses.length).toBe(4);

        // Call history() multiple times
        for (let i = 0; i < 5; i++) {
            const history = game.history({ verbose: true });
            console.log(`[TEST] history() call ${i + 1}, length: ${history.length}`);

            // Check board state after each history() call
            const board = game.board();
            const octopuses = board.flat().filter((sq) => sq?.type === 'o' && sq?.color === 'b');
            console.log(
                `[TEST] After history() call ${i + 1} - black octopuses:`,
                octopuses.map((p) => p?.square),
            );

            expect(octopuses.length).toBe(4);
            expect(octopuses.map((p) => p?.square).sort()).toEqual(['a6', 'd6', 'e6', 'h6']);
        }
    });
});
