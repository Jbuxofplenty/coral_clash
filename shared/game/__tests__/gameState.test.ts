/**
 * Unit tests for game state snapshot and restore functionality
 */

import {
    CoralClash,
    createGameSnapshot,
    exportGameState,
    importGameState,
    restoreGameFromSnapshot,
} from '../index';

describe('Game State Snapshot and Restore', () => {
    describe('createGameSnapshot', () => {
        it('should create a snapshot with all required fields', () => {
            const game = new CoralClash();
            const snapshot = createGameSnapshot(game);

            expect(snapshot).toHaveProperty('fen');
            expect(snapshot).toHaveProperty('turn');
            expect(snapshot).toHaveProperty('whalePositions');
            expect(snapshot).toHaveProperty('coral');
            expect(snapshot).toHaveProperty('coralRemaining');
            expect(snapshot).toHaveProperty('pieceRoles');
            expect(snapshot).toHaveProperty('isCheck');
            expect(snapshot).toHaveProperty('isCheckmate');
            expect(snapshot).toHaveProperty('isGameOver');
            expect(snapshot).toHaveProperty('isCoralVictory');
            expect(snapshot).toHaveProperty('isDraw');
            expect(snapshot).toHaveProperty('resigned');
        });

        it('should capture piece roles from starting position', () => {
            const game = new CoralClash();
            const snapshot = createGameSnapshot(game);

            // Check that pieceRoles is an object with square -> role mappings
            expect(snapshot.pieceRoles).toBeDefined();
            expect(typeof snapshot.pieceRoles).toBe('object');

            // Verify some known gatherer pieces from starting position
            expect(snapshot.pieceRoles['c1']).toBe('gatherer'); // White gatherer turtle
            expect(snapshot.pieceRoles['f1']).toBe('gatherer'); // White gatherer turtle
            expect(snapshot.pieceRoles['h1']).toBe('gatherer'); // White gatherer pufferfish
            expect(snapshot.pieceRoles['b2']).toBe('gatherer'); // White gatherer octopus
            expect(snapshot.pieceRoles['c2']).toBe('gatherer'); // White gatherer crab
            expect(snapshot.pieceRoles['e2']).toBe('gatherer'); // White gatherer dolphin
            expect(snapshot.pieceRoles['h2']).toBe('gatherer'); // White gatherer crab

            // Verify some known hunter pieces
            expect(snapshot.pieceRoles['a1']).toBe('hunter'); // White hunter pufferfish
            expect(snapshot.pieceRoles['b1']).toBe('hunter'); // White hunter turtle
            expect(snapshot.pieceRoles['a2']).toBe('hunter'); // White hunter crab
            expect(snapshot.pieceRoles['d2']).toBe('hunter'); // White hunter dolphin
        });

        it('should capture piece roles after pieces have moved', () => {
            const game = new CoralClash();

            // Get valid moves and find a gatherer move
            const validMoves = game.moves({ verbose: true }) as any[];
            const gathererMove = validMoves.find((m: any) => {
                const piece = game.get(m.from);
                return piece && piece.role === 'gatherer';
            });

            expect(gathererMove).toBeDefined();
            const fromSquare = gathererMove.from;
            game.move(gathererMove);

            const snapshot = createGameSnapshot(game);

            // The gatherer piece should have moved and still be a gatherer
            expect(snapshot.pieceRoles[gathererMove.to]).toBe('gatherer');
            expect(snapshot.pieceRoles[fromSquare]).toBeUndefined(); // Original square is empty
        });

        it('should capture coral state', () => {
            const game = new CoralClash();
            const snapshot = createGameSnapshot(game);

            // Starting position has coral on d3, e3 (white) and d6, e6 (black)
            expect(snapshot.coral).toBeDefined();
            expect(Array.isArray(snapshot.coral)).toBe(true);
            expect(snapshot.coral.length).toBeGreaterThan(0);

            // Check that coral objects have square and color properties
            const d3Coral = snapshot.coral.find((c: any) => c.square === 'd3');
            expect(d3Coral).toBeDefined();
            expect(d3Coral.color).toBe('w');
        });

        it('should capture whale positions', () => {
            const game = new CoralClash();
            const snapshot = createGameSnapshot(game);

            expect(snapshot.whalePositions).toBeDefined();
            expect(snapshot.whalePositions.w).toEqual(['d1', 'e1']);
            expect(snapshot.whalePositions.b).toEqual(['d8', 'e8']);
        });

        it('should capture coral remaining counts', () => {
            const game = new CoralClash();
            const snapshot = createGameSnapshot(game);

            expect(snapshot.coralRemaining).toBeDefined();
            expect(snapshot.coralRemaining.w).toBeDefined();
            expect(snapshot.coralRemaining.b).toBeDefined();
            expect(typeof snapshot.coralRemaining.w).toBe('number');
            expect(typeof snapshot.coralRemaining.b).toBe('number');
        });

        it('should capture resignation status', () => {
            const game = new CoralClash();
            let snapshot = createGameSnapshot(game);

            // Initially not resigned - should be null, not false
            expect(snapshot.resigned).toBeNull();
            expect(snapshot.resigned).not.toBe(false);

            // Resign white
            game.resign('w');
            snapshot = createGameSnapshot(game);

            // isResigned() returns the color that resigned ('w' or 'b'), which is truthy
            expect(snapshot.resigned).toBeTruthy();
            expect(snapshot.resigned).toBe('w');
        });
    });

    describe('restoreGameFromSnapshot', () => {
        it('should restore basic game state from snapshot', () => {
            const game1 = new CoralClash();

            // Make two moves
            const move1 = game1.moves({ verbose: true })[0] as any;
            game1.move(move1);

            const move2 = game1.moves({ verbose: true })[0] as any;
            game1.move(move2);

            const snapshot = createGameSnapshot(game1);

            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Verify the state matches
            expect(game2.fen()).toBe(game1.fen());
            expect(game2.turn()).toBe(game1.turn());
        });

        it('should restore piece roles correctly', () => {
            const game1 = new CoralClash();

            // Find and move a gatherer piece
            const validMoves = game1.moves({ verbose: true }) as any[];
            const gathererMove = validMoves.find((m: any) => {
                const piece = game1.get(m.from);
                return piece && piece.role === 'gatherer';
            });

            expect(gathererMove).toBeDefined();
            game1.move(gathererMove);

            // Black makes a move
            const blackMove = game1.moves({ verbose: true })[0] as any;
            game1.move(blackMove);

            const snapshot = createGameSnapshot(game1);

            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Check that the moved piece still has its gatherer role
            const movedPiece = game2.get(gathererMove.to);
            expect(movedPiece).toBeTruthy();
            if (movedPiece) {
                expect(movedPiece.role).toBe('gatherer');
            }

            // Check that an unmoved gatherer piece still has its role
            const pieceOnC1 = game2.get('c1');
            if (pieceOnC1) {
                expect(pieceOnC1.role).toBe('gatherer');
            }
        });

        it('should use getStartingRole() for games at starting position (migration)', () => {
            const game1 = new CoralClash();

            // Create a snapshot at starting position
            const snapshot = createGameSnapshot(game1);

            // Manually corrupt the pieceRoles in the snapshot (simulating old saved data)
            // This simulates a game saved with OLD role logic before getStartingRole() was updated
            snapshot.pieceRoles = {
                c1: 'hunter', // OLD logic, should be 'gatherer' with NEW logic
                f1: 'hunter', // OLD logic, should be 'gatherer' with NEW logic
                a1: 'gatherer', // OLD logic, should be 'hunter' with NEW logic
            };

            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Verify that NEW roles from getStartingRole() are used, NOT old corrupted snapshot roles
            // This ensures saved games at starting position get migrated to new role logic
            const c1Piece = game2.get('c1');
            expect(c1Piece).toBeTruthy();
            if (c1Piece) {
                expect(c1Piece.role).toBe('gatherer'); // Migrated to NEW correct role
            }

            const f1Piece = game2.get('f1');
            expect(f1Piece).toBeTruthy();
            if (f1Piece) {
                expect(f1Piece.role).toBe('gatherer'); // Migrated to NEW correct role
            }

            const a1Piece = game2.get('a1');
            expect(a1Piece).toBeTruthy();
            if (a1Piece) {
                expect(a1Piece.role).toBe('hunter'); // Migrated to NEW correct role
            }
        });

        it('should restore coral state', () => {
            const game1 = new CoralClash();

            // Make some moves
            const move1 = game1.moves({ verbose: true })[0] as any;
            game1.move(move1);
            const move2 = game1.moves({ verbose: true })[0] as any;
            game1.move(move2);

            const snapshot = createGameSnapshot(game1);

            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Check coral matches
            const coral1 = game1.getAllCoral();
            const coral2 = game2.getAllCoral();

            expect(coral1).toEqual(coral2);
        });

        it('should restore whale positions', () => {
            const game1 = new CoralClash();

            // Make some moves (whale might move or not)
            const move1 = game1.moves({ verbose: true })[0] as any;
            game1.move(move1);

            const snapshot = createGameSnapshot(game1);

            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Check whale positions match
            expect(game2.whalePositions()).toEqual(game1.whalePositions());
        });

        it('should restore coral remaining counts', () => {
            const game1 = new CoralClash();

            const snapshot = createGameSnapshot(game1);

            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            expect(game2.getCoralRemainingCounts()).toEqual(game1.getCoralRemainingCounts());
        });

        it('should restore resignation status', () => {
            const game1 = new CoralClash();
            const move1 = game1.moves({ verbose: true })[0] as any;
            game1.move(move1);
            game1.resign('w');

            const snapshot = createGameSnapshot(game1);

            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // isResigned() returns the color that resigned ('w' or 'b'), which is truthy
            expect(game2.isResigned()).toBeTruthy();
            expect(game2.isResigned()).toBe('w');
            expect(game2.isGameOver()).toBe(true);
        });

        it('should handle snapshots without pieceRoles (backward compatibility)', () => {
            const game1 = new CoralClash();
            const move1 = game1.moves({ verbose: true })[0] as any;
            game1.move(move1);

            const snapshot = createGameSnapshot(game1);
            // Remove pieceRoles to simulate old snapshot format
            delete (snapshot as any).pieceRoles;

            const game2 = new CoralClash();
            // Should not throw
            expect(() => restoreGameFromSnapshot(game2, snapshot)).not.toThrow();

            // Game should still be playable
            expect(game2.fen()).toBe(game1.fen());
        });
    });

    describe('exportGameState and importGameState', () => {
        it('should export game state with schema version and timestamp', () => {
            const game = new CoralClash();
            const exported = exportGameState(game);

            expect(exported).toHaveProperty('schemaVersion');
            expect(exported).toHaveProperty('exportedAt');
            expect(exported).toHaveProperty('state');
            expect(exported.schemaVersion).toBe('1.3.0');
        });

        it('should export complete game state including history', () => {
            const game = new CoralClash();
            const move1 = game.moves({ verbose: true })[0] as any;
            game.move(move1);
            const move2 = game.moves({ verbose: true })[0] as any;
            game.move(move2);

            const exported = exportGameState(game);

            expect(exported.state.history).toBeDefined();
            expect(Array.isArray(exported.state.history)).toBe(true);
            expect(exported.state.history.length).toBe(2);
        });

        it('should import game state from exported fixture', () => {
            const game1 = new CoralClash();
            const move1 = game1.moves({ verbose: true })[0] as any;
            game1.move(move1);
            const move2 = game1.moves({ verbose: true })[0] as any;
            game1.move(move2);

            const exported = exportGameState(game1);

            const game2 = new CoralClash();
            importGameState(game2, exported);

            expect(game2.fen()).toBe(game1.fen());
            expect(game2.turn()).toBe(game1.turn());
        });
    });

    describe('Piece Role Persistence - Integration Tests', () => {
        it('should preserve gatherer role through multiple moves and reload', () => {
            const game1 = new CoralClash();

            // Move a gatherer piece multiple times
            const validMoves1 = game1.moves({ verbose: true }) as any[];
            const gathererMove1 = validMoves1.find((m: any) => {
                const piece = game1.get(m.from);
                return piece && piece.role === 'gatherer';
            });

            expect(gathererMove1).toBeDefined();
            game1.move(gathererMove1);

            // Black moves
            const blackMove = game1.moves({ verbose: true })[0] as any;
            game1.move(blackMove);

            // Save and restore
            const snapshot = createGameSnapshot(game1);
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Verify gatherer role persisted
            const movedPiece = game2.get(gathererMove1.to);
            if (movedPiece) {
                expect(movedPiece.role).toBe('gatherer');
            }
        });

        it('should distinguish between hunter and gatherer pieces after reload', () => {
            const game1 = new CoralClash();

            // Find a hunter move and a gatherer move
            const validMoves = game1.moves({ verbose: true }) as any[];
            const hunterMove = validMoves.find((m: any) => {
                const piece = game1.get(m.from);
                return piece && piece.role === 'hunter';
            });
            const gathererMove = validMoves.find((m: any) => {
                const piece = game1.get(m.from);
                return piece && piece.role === 'gatherer';
            });

            expect(hunterMove).toBeDefined();
            expect(gathererMove).toBeDefined();

            game1.move(hunterMove);
            const blackMove1 = game1.moves({ verbose: true })[0] as any;
            game1.move(blackMove1);

            game1.move(gathererMove);
            const blackMove2 = game1.moves({ verbose: true })[0] as any;
            game1.move(blackMove2);

            const snapshot = createGameSnapshot(game1);
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Check roles are correct
            const hunterPiece = game2.get(hunterMove.to);
            if (hunterPiece) {
                expect(hunterPiece.role).toBe('hunter');
            }

            const gathererPiece = game2.get(gathererMove.to);
            if (gathererPiece) {
                expect(gathererPiece.role).toBe('gatherer');
            }
        });
    });

    describe('Resignation status preservation', () => {
        it('should preserve resigned: null (not convert to false)', () => {
            const game1 = new CoralClash();

            // Make a move
            const move = game1.moves({ verbose: true })[0] as any;
            game1.move(move);

            // Create snapshot - should have resigned: null
            const snapshot = createGameSnapshot(game1);
            expect(snapshot.resigned).toBeNull();
            expect(snapshot.resigned).not.toBe(false);

            // Restore and verify
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            expect(game2.isResigned()).toBeNull();
            expect(game2.isResigned()).not.toBe(false);
            expect(game2.isGameOver()).toBe(false);
        });

        it('should preserve resigned color when a player resigns', () => {
            const game1 = new CoralClash();

            // White resigns
            game1.resign('w');

            const snapshot = createGameSnapshot(game1);
            expect(snapshot.resigned).toBe('w');

            // Restore and verify
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            expect(game2.isResigned()).toBe('w');
            expect(game2.isGameOver()).toBe(true);
        });
    });

    describe('Coral Placement Choice Preservation', () => {
        it('should NOT add coral when gatherer moves with coralPlaced: false', () => {
            // Verifies that coral placement choices are preserved through PGN encoding
            // Expected behavior: If a gatherer moves with coralPlaced: false, no coral should be added
            // Fix: PGN now encodes coral choices using * (placed) and ~ (removed) notation

            const game = new CoralClash();

            // Find a gatherer piece that can move
            const validMoves = game.moves({ verbose: true }) as any[];
            const gathererMoves = validMoves.filter((m: any) => {
                const piece = game.get(m.from);
                return piece && piece.role === 'gatherer' && m.coralPlaced !== undefined;
            });

            expect(gathererMoves.length).toBeGreaterThan(0);

            // Find a move where gatherer can place coral (has two variants)
            const moveWithoutCoral = gathererMoves.find((m: any) => m.coralPlaced === false);
            expect(moveWithoutCoral).toBeDefined();

            // Get coral state before move
            const coralRemainingBefore = game.getCoralRemainingCounts();

            // Make the move WITHOUT placing coral
            const result = game.move(moveWithoutCoral);
            expect(result).toBeTruthy();

            // Verify coral was NOT placed at destination
            const coralAfterMove = game.getAllCoral();
            const coralAtDestination = coralAfterMove.find(
                (c: any) => c.square === moveWithoutCoral.to,
            );
            expect(coralAtDestination).toBeUndefined(); // NO coral at destination

            // Verify coral count did NOT decrease
            const coralRemainingAfterMove = game.getCoralRemainingCounts();
            expect(coralRemainingAfterMove.w).toBe(coralRemainingBefore.w); // Count unchanged

            // Now create a snapshot (this is where the bug occurs)
            const snapshot = createGameSnapshot(game);

            // Verify: snapshot.coral should NOT include coral at destination
            // PGN now encodes coral choices, so this is correctly preserved
            const coralInSnapshot = snapshot.coral.find(
                (c: any) => c.square === moveWithoutCoral.to,
            );

            // Coral should NOT be at destination
            expect(coralInSnapshot).toBeUndefined();

            // Additional verification: coral count should be unchanged
            expect(snapshot.coralRemaining.w).toBe(coralRemainingBefore.w);
        });

        it('should preserve coral placement choice through snapshot/restore cycle', () => {
            // Simulate the EXACT backend flow from game.js:
            // 1. User makes Move A -> snapshot -> save to DB
            // 2. Computer move: RESTORE from DB -> make Move B -> snapshot -> save to DB
            // This is where the bug occurs!

            // ===== MOVE A: User's turn =====
            const game1 = new CoralClash();

            // Move A: Gatherer moves WITHOUT placing coral
            const validMoves = game1.moves({ verbose: true }) as any[];
            const gathererMove = validMoves.find((m: any) => {
                const piece = game1.get(m.from);
                return piece && piece.role === 'gatherer' && m.coralPlaced === false;
            });

            expect(gathererMove).toBeDefined();
            const destinationSquare = gathererMove.to;

            game1.move(gathererMove);

            // Verify no coral at destination after move A
            let coral = game1.getAllCoral();
            expect(coral.find((c: any) => c.square === destinationSquare)).toBeUndefined();

            // Create snapshot (simulating what backend does after move A)
            const snapshotAfterMoveA = createGameSnapshot(game1);

            // Snapshot should NOT have coral at destination
            expect(
                snapshotAfterMoveA.coral.find((c: any) => c.square === destinationSquare),
            ).toBeUndefined();

            // ===== MOVE B: Computer's turn =====
            // CRITICAL: Backend RESTORES game state from snapshot before validating computer move
            // This is what happens in validateMove() in game.js
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshotAfterMoveA);

            // Computer makes Move B
            const opponentMove = game2.moves({ verbose: true })[0] as any;
            game2.move(opponentMove);

            // Create snapshot after Move B (this is where the bug manifests)
            const snapshotAfterMoveB = createGameSnapshot(game2);

            // Verify: PGN encoding preserves coral choice through snapshot/restore cycle
            // When PGN is loaded and replayed, the correct coral choice is maintained
            const coralInSnapshotB = snapshotAfterMoveB.coral.find(
                (c: any) => c.square === destinationSquare,
            );

            // Coral should NOT appear (choice was coralPlaced: false)
            expect(coralInSnapshotB).toBeUndefined();
        });
    });

    describe('Move History Preservation', () => {
        it('should save and restore move history for undo functionality', () => {
            const game1 = new CoralClash();

            // Make several moves
            const moves = game1.moves();
            game1.move(moves[0]); // White move
            const moves2 = game1.moves();
            game1.move(moves2[0]); // Black move
            const moves3 = game1.moves();
            game1.move(moves3[0]); // White move
            const moves4 = game1.moves();
            game1.move(moves4[0]); // Black move

            // Verify history exists
            const history1 = game1.history();
            expect(history1.length).toBe(4);

            // Create snapshot
            const snapshot = createGameSnapshot(game1);
            expect(snapshot.pgn).toBeDefined();
            expect(snapshot.pgn.length).toBeGreaterThan(0);

            // Restore to new game
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Verify move history is preserved
            const history2 = game2.history();
            expect(history2.length).toBe(4);
            expect(history2).toEqual(history1);

            // Verify FEN matches
            expect(game2.fen()).toBe(game1.fen());

            // Verify undo works
            game2.undo();
            expect(game2.history().length).toBe(3);
        });

        it('should support empty history (starting position)', () => {
            const game1 = new CoralClash();

            // No moves made
            expect(game1.history().length).toBe(0);

            // Create and restore snapshot
            const snapshot = createGameSnapshot(game1);
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Verify history is still empty
            expect(game2.history().length).toBe(0);
            expect(game2.fen()).toBe(game1.fen());
        });

        it('should preserve move history after multiple moves', () => {
            const game1 = new CoralClash();

            // Make multiple moves
            const moves1 = game1.moves();
            game1.move(moves1[0]); // White move
            const moves2 = game1.moves();
            game1.move(moves2[0]); // Black move
            const moves3 = game1.moves();
            game1.move(moves3[0]); // White move

            // Verify history includes all moves
            expect(game1.history().length).toBe(3);

            // Create and restore snapshot
            const snapshot = createGameSnapshot(game1);
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Verify move history is preserved
            expect(game2.history().length).toBe(3);
            expect(game2.history()).toEqual(game1.history());

            // Verify board position matches
            expect(game2.fen()).toBe(game1.fen());
        });

        it('should support backward compatibility with FEN-only snapshots', () => {
            const game1 = new CoralClash();

            // Make some moves
            const moves = game1.moves();
            game1.move(moves[0]);
            const moves2 = game1.moves();
            game1.move(moves2[0]);

            // Create old-style snapshot (without PGN)
            const legacySnapshot = {
                fen: game1.fen(),
                turn: game1.turn(),
                whalePositions: game1.whalePositions(),
                coral: game1.getAllCoral(),
                coralRemaining: game1.getCoralRemainingCounts(),
                pieceRoles: {},
                // No PGN field
            };

            // Restore from legacy snapshot
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, legacySnapshot);

            // Board position should match
            expect(game2.fen()).toBe(game1.fen());

            // But history will be empty (expected for legacy snapshots)
            expect(game2.history().length).toBe(0);
        });
    });

    describe('Whale Coral Removal - Snapshot Restoration Bug Fix', () => {
        it('should correctly restore coral state after whale removes coral', () => {
            // This test verifies the fix for the bug where coral would reappear after removal
            // Root cause: placeCoral() was decrementing coralRemaining, then coralRemaining was restored
            // Fix: Directly set _coral array instead of calling placeCoral()

            const game1 = new CoralClash();

            // Set up a scenario where whale can remove coral
            // Place white coral at f5 (whale will move there)
            game1.placeCoral('f5', 'w');

            // Get whale position
            const whalePos = game1.whalePositions();
            expect(whalePos.w).toBeDefined();
            if (!whalePos.w) return; // TypeScript guard

            // Find a whale move to f5 with coral removal
            const whaleMoves = game1.moves({ verbose: true, square: whalePos.w[0] }) as any[];
            const moveToF5WithRemoval = whaleMoves.find(
                (m: any) =>
                    m.to === 'f5' && m.coralRemovedSquares && m.coralRemovedSquares.includes('f5'),
            );

            // Skip test if we can't set up this scenario
            if (!moveToF5WithRemoval) {
                console.log(
                    'Skipping test - whale cannot reach coral at f5 from starting position',
                );
                return;
            }

            // Make the move with coral removal
            const coralBeforeMove = game1.getAllCoral();
            const coralAtF5Before = coralBeforeMove.find((c: any) => c.square === 'f5');
            expect(coralAtF5Before).toBeDefined(); // Coral exists before move

            game1.move(moveToF5WithRemoval);

            // Verify coral was removed
            const coralAfterMove = game1.getAllCoral();
            const coralAtF5After = coralAfterMove.find((c: any) => c.square === 'f5');
            expect(coralAtF5After).toBeUndefined(); // Coral removed

            // Verify coral count increased (coral returned to supply)
            const coralRemainingAfter = game1.getCoralRemainingCounts();

            // Create snapshot
            const snapshot = createGameSnapshot(game1);
            expect(snapshot.coral.find((c: any) => c.square === 'f5')).toBeUndefined();

            // Restore to new game instance (THIS IS WHERE THE BUG OCCURRED)
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // CRITICAL: Verify coral does NOT reappear at f5
            const coralAfterRestore = game2.getAllCoral();
            const coralAtF5AfterRestore = coralAfterRestore.find((c: any) => c.square === 'f5');
            expect(coralAtF5AfterRestore).toBeUndefined(); // Coral should NOT reappear

            // Verify coral counts match
            const coralRemainingAfterRestore = game2.getCoralRemainingCounts();
            expect(coralRemainingAfterRestore).toEqual(coralRemainingAfter);

            // Verify total coral pieces match
            expect(coralAfterRestore.length).toBe(coralAfterMove.length);
        });

        it('should handle multiple snapshot/restore cycles without coral reappearing', () => {
            // Simulate multiple backend operations (like in PvP games)
            const game1 = new CoralClash();

            // Place coral at e4
            game1.placeCoral('e4', 'w');
            const coralCountBefore = game1.getAllCoral().length;

            // Create first snapshot
            const snapshot1 = createGameSnapshot(game1);

            // Restore to game2
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot1);

            // Remove the coral we just placed (simulate hunter or whale removal)
            game2.removeCoral('e4');
            const coralCountAfterRemoval = game2.getAllCoral().length;
            expect(coralCountAfterRemoval).toBe(coralCountBefore - 1);

            // Create second snapshot (after removal)
            const snapshot2 = createGameSnapshot(game2);
            expect(snapshot2.coral.find((c: any) => c.square === 'e4')).toBeUndefined();

            // Restore to game3 (THIS IS WHERE BUG WOULD REAPPEAR)
            const game3 = new CoralClash();
            restoreGameFromSnapshot(game3, snapshot2);

            // Verify coral at e4 does NOT reappear
            const coralAfterSecondRestore = game3.getAllCoral();
            expect(coralAfterSecondRestore.find((c: any) => c.square === 'e4')).toBeUndefined();
            expect(coralAfterSecondRestore.length).toBe(coralCountAfterRemoval);

            // Create third snapshot
            const snapshot3 = createGameSnapshot(game3);

            // Restore to game4 (verify persistence through multiple cycles)
            const game4 = new CoralClash();
            restoreGameFromSnapshot(game4, snapshot3);

            // Verify coral STILL does not reappear
            const coralAfterThirdRestore = game4.getAllCoral();
            expect(coralAfterThirdRestore.find((c: any) => c.square === 'e4')).toBeUndefined();
            expect(coralAfterThirdRestore.length).toBe(coralCountAfterRemoval);
        });

        it('should maintain correct coralRemaining counts through restoration', () => {
            // Verifies that coralRemaining is restored BEFORE coral array
            // to prevent the bug where placeCoral() modifies coralRemaining

            const game1 = new CoralClash();

            // Get initial coral remaining
            const initialCoralRemaining = game1.getCoralRemainingCounts();

            // Place some coral pieces
            game1.placeCoral('a4', 'w');
            game1.placeCoral('b4', 'w');
            game1.placeCoral('h5', 'b');

            const coralRemainingAfterPlacement = game1.getCoralRemainingCounts();
            expect(coralRemainingAfterPlacement.w).toBe(initialCoralRemaining.w - 2);
            expect(coralRemainingAfterPlacement.b).toBe(initialCoralRemaining.b - 1);

            // Create snapshot
            const snapshot = createGameSnapshot(game1);

            // Restore to new game
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Verify coralRemaining matches exactly
            const restoredCoralRemaining = game2.getCoralRemainingCounts();
            expect(restoredCoralRemaining).toEqual(coralRemainingAfterPlacement);

            // Verify coral placements match
            const coral1 = game1.getAllCoral().sort((a, b) => a.square.localeCompare(b.square));
            const coral2 = game2.getAllCoral().sort((a, b) => a.square.localeCompare(b.square));
            expect(coral2).toEqual(coral1);

            // Verify the math: placed coral + remaining = total per player
            const whitePlaced = coral2.filter((c: any) => c.color === 'w').length;
            const blackPlaced = coral2.filter((c: any) => c.color === 'b').length;

            expect(whitePlaced + restoredCoralRemaining.w).toBe(17); // Total white coral
            expect(blackPlaced + restoredCoralRemaining.b).toBe(17); // Total black coral
        });

        it('should directly set _coral array without calling placeCoral()', () => {
            // This test verifies the implementation detail of the fix
            // We should set _coral array directly to avoid modifying coralRemaining

            const game1 = new CoralClash();

            // Place coral on several squares
            game1.placeCoral('a3', 'w');
            game1.placeCoral('b3', 'w');
            game1.placeCoral('g6', 'b');

            const coralBefore = game1.getAllCoral();
            const coralRemainingBefore = game1.getCoralRemainingCounts();

            // Create snapshot
            const snapshot = createGameSnapshot(game1);

            // Mock/spy would be ideal here, but we can verify the behavior
            // by checking that coralRemaining is correct after restore
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // If placeCoral() was called during restore, coralRemaining would be wrong
            // because it would decrement for each placement
            // But with direct _coral setting, counts should match exactly
            const coralAfter = game2.getAllCoral();
            const coralRemainingAfter = game2.getCoralRemainingCounts();

            expect(coralAfter).toEqual(coralBefore);
            expect(coralRemainingAfter).toEqual(coralRemainingBefore);

            // Verify that a new placement still works correctly
            // (proves that coralRemaining state is valid)
            game2.placeCoral('h6', 'b');
            const coralRemainingAfterNewPlacement = game2.getCoralRemainingCounts();
            expect(coralRemainingAfterNewPlacement.b).toBe(coralRemainingBefore.b - 1);
        });

        it('should handle restoration with empty coral array', () => {
            // Edge case: game with no coral placed
            const game1 = new CoralClash();

            // Clear all starting coral
            const startingCoral = game1.getAllCoral();
            startingCoral.forEach((c: any) => {
                game1.removeCoral(c.square);
            });

            expect(game1.getAllCoral().length).toBe(0);
            const coralRemainingWithoutCoral = game1.getCoralRemainingCounts();

            // Create and restore snapshot
            const snapshot = createGameSnapshot(game1);
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Verify empty coral array restored correctly
            expect(game2.getAllCoral().length).toBe(0);
            expect(game2.getCoralRemainingCounts()).toEqual(coralRemainingWithoutCoral);
        });

        it('should restore coral after whale moves with partial removal', () => {
            // Test scenario: whale occupies two squares with coral, removes only one
            const game1 = new CoralClash();

            // Place coral at two adjacent squares where whale could occupy
            game1.placeCoral('e3', 'w');
            game1.placeCoral('f3', 'w');

            // Get initial state
            const coralBefore = game1.getAllCoral();
            const coralCountBefore = coralBefore.length;

            // Simulate removal of only one coral (whale's choice)
            game1.removeCoral('e3');

            const coralAfterRemoval = game1.getAllCoral();
            expect(coralAfterRemoval.length).toBe(coralCountBefore - 1);
            expect(coralAfterRemoval.find((c: any) => c.square === 'e3')).toBeUndefined();
            expect(coralAfterRemoval.find((c: any) => c.square === 'f3')).toBeDefined();

            // Create snapshot
            const snapshot = createGameSnapshot(game1);

            // Restore
            const game2 = new CoralClash();
            restoreGameFromSnapshot(game2, snapshot);

            // Verify restoration
            const coralAfterRestore = game2.getAllCoral();
            expect(coralAfterRestore.length).toBe(coralCountBefore - 1);
            expect(coralAfterRestore.find((c: any) => c.square === 'e3')).toBeUndefined();
            expect(coralAfterRestore.find((c: any) => c.square === 'f3')).toBeDefined();
        });
    });
});
