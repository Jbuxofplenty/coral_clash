/**
 * Tests for whale rotation moves and disambiguation
 *
 * This test suite covers the whale rotation bug where the UI would select
 * the wrong move when both rotation and parallel slide moves were available.
 *
 * Key issue: When specifying BOTH whaleSecondSquare AND coralRemovedSquares,
 * the game engine was only matching on coralRemovedSquares, returning the
 * wrong move (parallel slide instead of rotation).
 *
 * The fix ensures both parameters are checked together for whale moves.
 */

import whaleRotation2 from '../__fixtures__/whale-rotation-2.json';
import whaleRotation3 from '../__fixtures__/whale-rotation-3.json';
import whaleRotation4 from '../__fixtures__/whale-rotation-4.json';
import whaleRotation from '../__fixtures__/whale-rotation.json';
import { CoralClash, applyFixture } from '../index';

describe('Whale Rotation Bug', () => {
    test('whale-rotation.json: demonstrates bug scenario with coral at destination', () => {
        // This is the original game state where the bug occurred
        // Whale at d1,e1 needs to rotate to d1,d2
        // There's coral at d2, which creates 4 possible moves to d2
        const game = new CoralClash();
        applyFixture(game, whaleRotation);

        expect(game.whalePositions().w).toEqual(['d1', 'e1']);
        expect(game.getCoral('d2')).toBe('w'); // Coral at destination is critical

        // Get all moves from e1 to d2
        const allMoves = game.moves({ verbose: true });
        const movesToD2FromE1 = allMoves.filter((m: any) => m.from === 'e1' && m.to === 'd2');

        // There should be 4 moves:
        // 1. Rotation (d1,d2) with coral
        // 2. Rotation (d1,d2) without coral (removing d2)
        // 3. Parallel slide (c2,d2) with coral
        // 4. Parallel slide (c2,d2) without coral (removing d2)
        expect(movesToD2FromE1.length).toBe(4);

        // Verify all 4 moves exist
        const rotationWithCoral = movesToD2FromE1.find(
            (m: any) => m.whaleSecondSquare === 'd1' && !m.coralRemovedSquares?.length,
        );
        const rotationWithoutCoral = movesToD2FromE1.find(
            (m: any) => m.whaleSecondSquare === 'd1' && m.coralRemovedSquares?.includes('d2'),
        );
        const parallelWithCoral = movesToD2FromE1.find(
            (m: any) => m.whaleSecondSquare === 'c2' && !m.coralRemovedSquares?.length,
        );
        const parallelWithoutCoral = movesToD2FromE1.find(
            (m: any) => m.whaleSecondSquare === 'c2' && m.coralRemovedSquares?.includes('d2'),
        );

        expect(rotationWithCoral).toBeDefined();
        expect(rotationWithoutCoral).toBeDefined();
        expect(parallelWithCoral).toBeDefined();
        expect(parallelWithoutCoral).toBeDefined();

        // THE FIX: When specifying BOTH whaleSecondSquare AND coralRemovedSquares,
        // the game engine should return the correct move (rotation to d1,d2)
        const result = game.move({
            from: 'e1',
            to: 'd2',
            whaleSecondSquare: 'd1', // Rotation (not parallel slide)
            coralRemovedSquares: ['d2'], // Remove coral from d2
        });

        expect(result).toBeTruthy();
        expect(result.whaleSecondSquare).toBe('d1'); // Should be d1, NOT c2
        expect(result.whaleOrientation).toBe('vertical'); // Should be vertical, NOT horizontal
        expect(result.coralRemovedSquares).toEqual(['d2']);

        const finalPos = game.whalePositions();
        expect(finalPos.w).toContain('d1');
        expect(finalPos.w).toContain('d2');
        expect(finalPos.w).not.toContain('c2'); // Should NOT be at c2
        expect(finalPos.w).not.toContain('e1');
    });

    test('whale-rotation-2.json: verify fix works in alternative scenario', () => {
        // This is a similar game state to verify the fix works consistently
        const game = new CoralClash();
        applyFixture(game, whaleRotation2);

        expect(game.whalePositions().w).toEqual(['d1', 'e1']);
        expect(game.getCoral('d2')).toBe('w'); // Coral at destination

        // Get all moves from e1 to d2
        const allMoves = game.moves({ verbose: true });
        const movesToD2FromE1 = allMoves.filter((m: any) => m.from === 'e1' && m.to === 'd2');

        // Should have 4 moves like in whale-rotation.json
        expect(movesToD2FromE1.length).toBe(4);

        // Test rotation with coral removal
        const result = game.move({
            from: 'e1',
            to: 'd2',
            whaleSecondSquare: 'd1',
            coralRemovedSquares: ['d2'],
        });

        expect(result).toBeTruthy();
        expect(result.whaleSecondSquare).toBe('d1');
        expect(result.whaleOrientation).toBe('vertical');
        expect(result.coralRemovedSquares).toEqual(['d2']);

        const finalPos = game.whalePositions();
        expect(finalPos.w).toContain('d1');
        expect(finalPos.w).toContain('d2');
        expect(finalPos.w).not.toContain('c2');
    });

    test('whale rotation - basic case without coral', () => {
        // Load a simple game state without coral complications
        const game = new CoralClash();
        game.load('ftth2tf/cocd1to1/3o1c2/D3O2c/2T1o3/3O4/CO2DCOC/FT1H1TTF w - - 1 9');

        // Verify whale is at d1, e1 (horizontal)
        const whalePositions = game.whalePositions();
        expect(whalePositions.w).toEqual(['d1', 'e1']);

        // User wants to rotate: keep d1 fixed, move e1 to d2
        // This should result in whale at d1, d2 (vertical orientation)
        const result = game.move({
            from: 'e1',
            to: 'd2',
            whaleSecondSquare: 'd1', // This tells the system we want rotation
        });

        expect(result).toBeTruthy();
        expect(result.whaleSecondSquare).toBe('d1');
        expect(result.whaleOrientation).toBe('vertical');

        const finalPos = game.whalePositions();
        expect(finalPos.w).toContain('d1');
        expect(finalPos.w).toContain('d2');
        expect(finalPos.w).not.toContain('c2');
    });

    test('Move disambiguation: two different moves to d2 - both are valid', () => {
        // This test shows there are TWO valid moves to d2

        // Test Move 1: Rotation (e1->d2, d1 stays fixed)
        const game1 = new CoralClash();
        game1.load('ftth2tf/cocd1to1/3o1c2/D3O2c/2T1o3/3O4/CO2DCOC/FT1H1TTF w - - 1 9');
        expect(game1.whalePositions().w).toEqual(['d1', 'e1']);

        const result1 = game1.move({ from: 'e1', to: 'd2', whaleSecondSquare: 'd1' });
        expect(result1).toBeTruthy();
        expect(result1.whaleSecondSquare).toBe('d1');
        expect(result1.whaleOrientation).toBe('vertical');

        const finalPos1 = game1.whalePositions();
        expect(finalPos1.w).toContain('d1');
        expect(finalPos1.w).toContain('d2');
        expect(finalPos1.w).not.toContain('c2');
        expect(finalPos1.w).not.toContain('e1');

        // Test Move 2: Parallel slide (d1->c2, e1->d2)
        const game2 = new CoralClash();
        game2.load('ftth2tf/cocd1to1/3o1c2/D3O2c/2T1o3/3O4/CO2DCOC/FT1H1TTF w - - 1 9');
        expect(game2.whalePositions().w).toEqual(['d1', 'e1']);

        const result2 = game2.move({ from: 'e1', to: 'd2', whaleSecondSquare: 'c2' });
        expect(result2).toBeTruthy();
        expect(result2.whaleSecondSquare).toBe('c2');
        expect(result2.whaleOrientation).toBe('horizontal');

        const finalPos2 = game2.whalePositions();
        expect(finalPos2.w).toContain('c2');
        expect(finalPos2.w).toContain('d2');
        expect(finalPos2.w).not.toContain('d1');
        expect(finalPos2.w).not.toContain('e1');

        // Both moves are valid! The issue is disambiguation
    });

    test('UI behavior: orientation options when whale destination selected', () => {
        // This test documents the expected UI behavior when selecting whale moves
        const game = new CoralClash();
        game.load('ftth2tf/cocd1to1/3o1c2/D3O2c/2T1o3/3O4/CO2DCOC/FT1H1TTF w - - 1 9');

        // Get all moves to d2
        const allMoves = game.moves({ verbose: true, piece: 'h' });
        const movesToD2 = allMoves.filter((m: any) => m.to === 'd2' && m.piece === 'h');

        // There should be orientation options for both d1 and c2
        const orientationOptions = new Set<string>();
        movesToD2.forEach((m: any) => {
            if (m.whaleSecondSquare) {
                orientationOptions.add(m.whaleSecondSquare);
            }
        });

        expect(orientationOptions.has('d1')).toBe(true);
        expect(orientationOptions.has('c2')).toBe(true);

        // The UI should show these two orientation options when user selects d2
        // Clicking on d1 should execute the rotation move (d1,d2)
        // Clicking on c2 should execute the parallel slide (c2,d2)
    });

    test('Coral removal options with rotation', () => {
        // When there's coral at the destination, user should be able to choose
        // whether to keep or remove the coral
        const game = new CoralClash();
        applyFixture(game, whaleRotation);

        expect(game.getCoral('d2')).toBe('w');

        // Test rotation WITH coral (keep coral at d2)
        const game1 = new CoralClash();
        applyFixture(game1, whaleRotation);

        const result1 = game1.move({
            from: 'e1',
            to: 'd2',
            whaleSecondSquare: 'd1',
            // No coralRemovedSquares specified = keep coral
        });

        expect(result1).toBeTruthy();
        expect(result1.whaleSecondSquare).toBe('d1');
        expect(result1.coralRemovedSquares || []).toHaveLength(0); // No coral removed
        expect(game1.getCoral('d2')).toBe('w'); // Coral still there

        // Test rotation WITHOUT coral (remove coral from d2)
        const game2 = new CoralClash();
        applyFixture(game2, whaleRotation);

        const result2 = game2.move({
            from: 'e1',
            to: 'd2',
            whaleSecondSquare: 'd1',
            coralRemovedSquares: ['d2'], // Remove coral
        });

        expect(result2).toBeTruthy();
        expect(result2.whaleSecondSquare).toBe('d1');
        expect(result2.coralRemovedSquares).toEqual(['d2']);
        expect(game2.getCoral('d2')).toBeNull(); // Coral removed
    });

    test('whale-rotation-3.json: rotate to d3,d2 with coral removal at d3', () => {
        // Bug: Whale should move to d3,d2 but visually appears at c2,c3
        const game = new CoralClash();
        applyFixture(game, whaleRotation3);

        // Verify initial state
        expect(game.whalePositions().w).toEqual(['d2', 'e2']);
        expect(game.getCoral('d3')).toBe('w'); // Coral at destination

        // Rotate whale: keep d2 fixed, move e2 to d3, remove coral at d3
        // This should result in whale at d2,d3 (vertical orientation)
        const result = game.move({
            from: 'e2',
            to: 'd3',
            whaleSecondSquare: 'd2', // Rotation - keep d2 fixed
            coralRemovedSquares: ['d3'], // Remove coral at d3
        });

        expect(result).toBeTruthy();

        // CRITICAL: Whale should be at d2,d3, NOT at c2,c3
        const finalPos = game.whalePositions();

        expect(result.whaleSecondSquare).toBe('d2');
        expect(result.whaleOrientation).toBe('vertical');
        expect(result.coralRemovedSquares).toEqual(['d3']);

        // Verify whale is at correct position
        expect(finalPos.w).toContain('d2');
        expect(finalPos.w).toContain('d3');
        expect(finalPos.w).not.toContain('c2'); // BUG: Whale appears here instead
        expect(finalPos.w).not.toContain('c3'); // BUG: Whale appears here instead
        expect(finalPos.w).not.toContain('e2');

        // Verify coral was removed
        expect(game.getCoral('d3')).toBeNull();
    });

    test('whale-rotation-4.json: whale position should not change when opponent moves', () => {
        // Bug: After white whale rotates to e2,e3, when black makes any move,
        // the white whale automatically rotates to e2,f2.
        const game = new CoralClash();
        applyFixture(game, whaleRotation4);

        // Verify initial state
        expect(game.turn()).toBe('b');
        const initialWhalePos = game.whalePositions().w;
        expect(initialWhalePos).toEqual(['e3', 'e2']); // Internal representation per FEN
        expect(game.whalePositions().b).toEqual(['d6', 'e6']);

        // Get a legal black move (any non-whale piece)
        const blackMoves = game.moves({ verbose: true, color: 'b' });
        const nonWhaleMoves = blackMoves.filter((m: any) => m.piece !== 'h');

        expect(nonWhaleMoves.length).toBeGreaterThan(0);

        const testMove = nonWhaleMoves[0];

        // Make the black move
        const result = game.move(testMove);
        expect(result).not.toBeNull();

        const afterMoveWhalePos = game.whalePositions().w;

        // CRITICAL: White whale should NOT have moved
        // Bug: it changes from ['e3', 'e2'] to ['e2', 'f2']
        expect(afterMoveWhalePos).toEqual(initialWhalePos);

        // Verify board state is consistent
        const board = game.board();
        const allWhales = board.flat().filter((sq: any) => sq && sq.type === 'h');
        expect(allWhales.length).toBe(4); // 2 squares for white whale + 2 for black whale
    });
});
