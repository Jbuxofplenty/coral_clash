const { CoralClash } = require('../shared/dist/game/v1.0.0/coralClash');

describe('Whale Rotation Bug', () => {
    test('whale rotation from d1,e1 to d1,d2 should work correctly', () => {
        // Load the game state from the fixture
        const game = new CoralClash();
        game.load('ftth2tf/cocd1to1/3o1c2/D3O2c/2T1o3/3O4/CO2DCOC/FT1H1TTF w - - 1 9');

        // Verify whale is at d1, e1 (horizontal)
        const whalePositions = game.whalePositions();
        expect(whalePositions.w).toEqual(['d1', 'e1']);

        // Get all legal moves for the whale
        const whaleMoves = game.moves({ verbose: true, square: 'd1' });
        console.log(
            'Moves from d1:',
            whaleMoves.map((m) => ({
                from: m.from,
                to: m.to,
                whaleSecondSquare: m.whaleSecondSquare,
                san: m.san,
            })),
        );

        const whaleMovesFromE1 = game.moves({ verbose: true, square: 'e1' });
        console.log(
            'Moves from e1:',
            whaleMovesFromE1.map((m) => ({
                from: m.from,
                to: m.to,
                whaleSecondSquare: m.whaleSecondSquare,
                san: m.san,
            })),
        );

        // User wants to rotate: keep d1 fixed, move e1 to d2
        // This should result in whale at d1, d2 (vertical orientation)
        // The move should be from e1 to d2, with whaleSecondSquare=d1
        const rotationMove = whaleMovesFromE1.find(
            (m) => m.from === 'e1' && m.to === 'd2' && m.whaleSecondSquare === 'd1',
        );

        expect(rotationMove).toBeDefined();
        console.log('Found rotation move:', rotationMove);

        // Execute the move
        const result = game.move({ from: 'e1', to: 'd2' });
        expect(result).toBeTruthy();

        // Verify final whale position is d1, d2 (vertical)
        const finalWhalePos = game.whalePositions();
        console.log('Final whale position:', finalWhalePos.w);
        expect(finalWhalePos.w).toContain('d1');
        expect(finalWhalePos.w).toContain('d2');
        expect(finalWhalePos.w).toHaveLength(2);
    });

    test('whale rotation - trying move from d1 to d2 should handle correctly', () => {
        // This test simulates what happens when user clicks d1 then d2
        const game = new CoralClash();
        game.load('ftth2tf/cocd1to1/3o1c2/D3O2c/2T1o3/3O4/CO2DCOC/FT1H1TTF w - - 1 9');

        // Verify whale is at d1, e1 (horizontal)
        const whalePositions = game.whalePositions();
        expect(whalePositions.w).toEqual(['d1', 'e1']);

        // User tries to move from d1 to d2
        // This could be interpreted as parallel slide (d1->d2, e1->e2)
        // NOT as rotation (e1 to d2 with d1 fixed)
        const allMoves = game.moves({ verbose: true });
        const matchingMoves = allMoves.filter((m) => m.from === 'd1' && m.to === 'd2');

        console.log(
            'Moves from d1 to d2:',
            matchingMoves.map((m) => ({
                from: m.from,
                to: m.to,
                whaleSecondSquare: m.whaleSecondSquare,
                whaleOrientation: m.whaleOrientation,
                san: m.san,
            })),
        );

        // Since there's no move from d1 to d2, the move() should throw an error
        expect(() => game.move({ from: 'd1', to: 'd2' })).toThrow('Invalid move');
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
        console.log('Rotation move result:', finalPos1.w);
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
        console.log('Parallel slide result:', finalPos2.w);
        expect(finalPos2.w).toContain('c2');
        expect(finalPos2.w).toContain('d2');
        expect(finalPos2.w).not.toContain('d1');
        expect(finalPos2.w).not.toContain('e1');

        // Both moves are valid! The issue is disambiguation
        console.log('✓ Both moves to d2 are valid and work correctly');
    });

    test('Fix: specify whaleSecondSquare to get correct move', () => {
        const game = new CoralClash();
        game.load('ftth2tf/cocd1to1/3o1c2/D3O2c/2T1o3/3O4/CO2DCOC/FT1H1TTF w - - 1 9');

        // User wants to rotate: keep d1 fixed, move e1 to d2
        // Must specify whaleSecondSquare to disambiguate
        const result = game.move({
            from: 'e1',
            to: 'd2',
            whaleSecondSquare: 'd1', // This tells the system we want rotation, not parallel slide
        });

        expect(result).toBeTruthy();
        const finalPos = game.whalePositions();
        console.log('Final position with whaleSecondSquare specified:', finalPos.w);
        expect(finalPos.w).toContain('d1');
        expect(finalPos.w).toContain('d2');
        expect(finalPos.w).not.toContain('c2');
    });

    test('UI bug fix: clicking on whale square during orientation selection', () => {
        // This test documents the UI bug that was fixed:
        // When user selects a destination (d2), then clicks on an orientation square (d1)
        // that happens to have the whale on it, the UI should treat it as an orientation
        // selection, NOT as selecting the piece again

        const game = new CoralClash();
        game.load('ftth2tf/cocd1to1/3o1c2/D3O2c/2T1o3/3O4/CO2DCOC/FT1H1TTF w - - 1 9');

        // Get all moves to d2
        const allMoves = game.moves({ verbose: true, piece: 'h' });
        const movesToD2 = allMoves.filter((m) => m.to === 'd2' && m.piece === 'h');

        // There should be orientation options for both d1 and c2
        const orientationOptions = new Set();
        movesToD2.forEach((m) => {
            if (m.whaleSecondSquare) {
                orientationOptions.add(m.whaleSecondSquare);
            }
        });

        expect(orientationOptions.has('d1')).toBe(true);
        expect(orientationOptions.has('c2')).toBe(true);

        // The fix ensures that when user clicks on d1 (which has the whale),
        // it's treated as selecting the orientation option, not re-selecting the piece
        console.log('UI fix: handleSelectPiece now checks whaleDestination before resetting state');
    });

    test('Disambiguation with coral: whaleSecondSquare + coralRemovedSquares together', () => {
        // From actual game state where user reported the bug
        // FEN from whale-rotation.json fixture
        const game = new CoralClash();
        game.load('ftth2tf/coc2t1c/2dood1o/D4c2/1DTC4/3OO3/CO3COC/FT1H1TTF w - - 7 8');

        // Restore coral state (coral at d2 is critical for this test)
        game.placeCoral('d2', 'w');
        game.placeCoral('d3', 'w');
        game.placeCoral('e3', 'w');
        game.placeCoral('a6', 'b');
        game.placeCoral('d6', 'b');
        game.placeCoral('e6', 'b');
        game.placeCoral('f7', 'b');

        expect(game.whalePositions().w).toEqual(['d1', 'e1']);
        expect(game.getCoral('d2')).toBe('w'); // Coral at destination is critical

        // Get all moves from e1 to d2 (should be 4 moves total)
        const allMoves = game.moves({ verbose: true });
        const movesToD2FromE1 = allMoves.filter((m) => m.from === 'e1' && m.to === 'd2');

        console.log(
            'All moves from e1 to d2:',
            movesToD2FromE1.map((m) => ({
                whaleSecondSquare: m.whaleSecondSquare,
                whaleOrientation: m.whaleOrientation,
                coralRemovedSquares: m.coralRemovedSquares,
            })),
        );

        // There should be 4 moves:
        // 1. Rotation (d1,d2) with coral
        // 2. Rotation (d1,d2) without coral (removing d2)
        // 3. Parallel slide (c2,d2) with coral
        // 4. Parallel slide (c2,d2) without coral (removing d2)
        expect(movesToD2FromE1.length).toBe(4);

        // THE BUG: When specifying BOTH whaleSecondSquare AND coralRemovedSquares,
        // the game engine was only matching on coralRemovedSquares and returning
        // the WRONG move (parallel slide to c2,d2 instead of rotation to d1,d2)

        // THE FIX: Now it checks BOTH parameters together for whale moves
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
        console.log('Final whale position:', finalPos.w);
        expect(finalPos.w).toContain('d1');
        expect(finalPos.w).toContain('d2');
        expect(finalPos.w).not.toContain('c2'); // Should NOT be at c2
        expect(finalPos.w).not.toContain('e1');
    });
});
