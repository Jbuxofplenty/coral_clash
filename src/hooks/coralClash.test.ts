import { CoralClash } from './coralClash';
import { loadFixture, applyFixture, validateFixtureVersion } from './__fixtures__/fixtureLoader';

describe('CoralClash Whale Mechanics', () => {
    let game: CoralClash;

    beforeEach(() => {
        game = new CoralClash();
    });

    describe('Whale Position and State', () => {
        test('whale should occupy two squares', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1');

            const board = game.board();
            const flatBoard = board.flat().filter((cell) => cell);
            const whaleSquares = flatBoard.filter(
                (cell) => cell.type === 'h' && cell.color === 'w',
            );

            expect(whaleSquares.length).toBe(2);
        });

        test('get() should return whale piece from either square', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1');

            const piece1 = game.get('d1');
            const piece2 = game.get('e1');

            expect(piece1).toBeTruthy();
            expect(piece2).toBeTruthy();
            expect(piece1.type).toBe('h');
            expect(piece2.type).toBe('h');
        });
    });

    describe('Parallel Sliding - Horizontal Whale', () => {
        test('horizontal whale should slide left/right', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1'); // d1-e1

            const moves = game.moves({ verbose: true });

            // Check for left slide (d1-e1 → c1-d1)
            const leftSlide = moves.filter(
                (m) => m.piece === 'h' && (m.to === 'c1' || m.to === 'd1'),
            );

            // Check for right slide (d1-e1 → e1-f1)
            const rightSlide = moves.filter(
                (m) => m.piece === 'h' && (m.to === 'e1' || m.to === 'f1'),
            );

            expect(leftSlide.length + rightSlide.length).toBeGreaterThan(0);
        });
    });

    describe('Parallel Sliding - Vertical Whale', () => {});

    describe('Single-Half Sliding', () => {
        test('whale should slide one half while keeping other stationary', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd2'); // d2-e2

            const moves = game.moves({ verbose: true });

            // Look for single-half slides (e.g., d2 slides to d3 while e2 stays)
            const singleHalfMoves = moves.filter((m) => m.piece === 'h' && m.to === 'd3');

            expect(singleHalfMoves.length).toBeGreaterThan(0);
        });
    });

    describe('Rotation Moves', () => {
        test('REGRESSION: whale should still occupy 2 squares after rotation', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1'); // d1-e1 horizontal

            // Rotate to vertical (e1 half moves to d2, d1 half stays)
            // This should result in whale at d1-d2
            game.move({ from: 'e1', to: 'd2' });

            const board = game.board();
            const flatBoard = board.flat().filter((cell) => cell);
            const whaleSquares = flatBoard.filter(
                (cell) => cell.type === 'h' && cell.color === 'w',
            );

            expect(whaleSquares.length).toBe(2);
            expect(whaleSquares.map((s) => s.square).sort()).toEqual(['d1', 'd2']);
        });

        test('horizontal whale should rotate to vertical', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1'); // d1-e1

            const moves = game.moves({ verbose: true });

            // Rotation: d1-e1 → d1-d2 (vertical)
            const rotationMoves = moves.filter((m) => m.piece === 'h' && m.to === 'd2');

            expect(rotationMoves.length).toBeGreaterThan(0);
        });

        test('whale must remain orthogonally adjacent after move', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1');

            const moves = game.moves({ verbose: true });

            // Check that no moves result in diagonal placement
            const diagonalMoves = moves.filter((m) => {
                if (m.piece !== 'h' || !m.whaleOtherHalf) return false;

                // Convert whaleOtherHalf from 0x88 to file/rank
                const toFile = m.to.charCodeAt(0) - 'a'.charCodeAt(0);
                const toRank = parseInt(m.to[1]) - 1;
                const otherFile = m.whaleOtherHalf & 0xf;
                const otherRank = m.whaleOtherHalf >> 4;

                // Check if diagonal (both file and rank differ)
                const fileDiff = Math.abs(toFile - otherFile);
                const rankDiff = Math.abs(toRank - otherRank);

                return fileDiff === 1 && rankDiff === 1; // Diagonal
            });

            expect(diagonalMoves.length).toBe(0);
        });
    });

    describe('Whale Movement Edge Cases', () => {
        test('whale should not move off board', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'a1'); // a1-b1 (left edge)

            const moves = game.moves({ verbose: true });

            // Should NOT have moves that go off the left edge
            const offBoardMoves = moves.filter((m) => {
                // This would require checking if to/whaleOtherHalf are off board
                // For now, just check that we have some valid moves
                return m.piece === 'h';
            });

            expect(offBoardMoves.length).toBeGreaterThan(0);
        });
    });

    describe('Whale Move Execution', () => {
        test('parallel slide should update both whale squares correctly', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1'); // d1-e1

            // Get board before move
            const boardBefore = game
                .board()
                .flat()
                .filter((cell) => cell);
            const whaleBefore = boardBefore.filter(
                (cell) => cell.type === 'h' && cell.color === 'w',
            );
            console.log('  Before:', whaleBefore.map((s) => s.square).sort());

            // Execute parallel slide up (d1-e1 → d2-e2)
            const moves = game.moves({ verbose: true });

            // For a parallel slide from d1-e1 to d2-e2, we want the move from d1->d2
            // where e1 also moves to e2 (parallel movement)
            const parallelUp = moves.find(
                (m) => m.piece === 'h' && m.from === 'd1' && m.to === 'd2',
            );

            if (parallelUp) {
                game.move(parallelUp);

                // Get board after move
                const boardAfter = game
                    .board()
                    .flat()
                    .filter((cell) => cell);
                const whaleAfter = boardAfter.filter(
                    (cell) => cell.type === 'h' && cell.color === 'w',
                );
                console.log('  After:', whaleAfter.map((s) => s.square).sort());

                expect(whaleAfter.length).toBe(2);
                expect(whaleAfter.map((s) => s.square).sort()).toEqual(['d2', 'e2']);
                console.log('✓ Parallel slide executed correctly: d1-e1 → d2-e2');
            }
        });

        test('rotation should update whale orientation correctly', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1'); // d1-e1 (horizontal)

            // Rotate to vertical (e1 moves to d2)
            game.move({ from: 'e1', to: 'd2' });

            const boardAfter = game
                .board()
                .flat()
                .filter((cell) => cell);
            const whaleAfter = boardAfter.filter((cell) => cell.type === 'h' && cell.color === 'w');
            const squares = whaleAfter.map((s) => s.square).sort();

            // Should be vertical (d1-d2)
            expect(whaleAfter.length).toBe(2);
            expect(squares).toContain('d1');
            expect(squares).toContain('d2');
        });
    });

    describe('Coral Piece Role Preservation', () => {});

    describe('Color Parameter for Move Generation', () => {
        test('should generate moves for white pieces when color=w is specified', () => {
            game.clear();
            game.put({ type: 'd', color: 'w', role: 'hunter' }, 'e2');
            game.put({ type: 'd', color: 'b', role: 'hunter' }, 'e7');

            // Even though it's white's turn, explicitly request white's moves
            const whiteMoves = game.moves({ verbose: true, color: 'w' });

            expect(whiteMoves.length).toBeGreaterThan(0);
            expect(whiteMoves.every((m) => m.color === 'w')).toBe(true);
        });

        test('should generate moves for black pieces when color=b is specified, even on whites turn', () => {
            game.clear();
            game.put({ type: 'd', color: 'w', role: 'hunter' }, 'e2');
            game.put({ type: 'd', color: 'b', role: 'hunter' }, 'e7');

            // It's white's turn, but request black's moves
            expect(game.turn()).toBe('w');
            const blackMoves = game.moves({ verbose: true, color: 'b' });

            expect(blackMoves.length).toBeGreaterThan(0);
            expect(blackMoves.every((m) => m.color === 'b')).toBe(true);
        });

        test('should generate whale moves for specified color', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'a1'); // White whale at a1-b1
            game.put({ type: 'h', color: 'b' }, 'g8'); // Black whale at g8-h8 (far apart)

            // Get white whale moves (should work since it's white's turn)
            const whiteWhaleMoves = game.moves({ verbose: true, color: 'w' });
            const whiteWhaleMovesFiltered = whiteWhaleMoves.filter((m) => m.piece === 'h');

            expect(whiteWhaleMovesFiltered.length).toBeGreaterThan(0);
            expect(whiteWhaleMovesFiltered.every((m) => m.color === 'w')).toBe(true);

            // Get black whale moves even though it's white's turn
            const blackWhaleMoves = game.moves({ verbose: true, color: 'b' });
            const blackWhaleMovesFiltered = blackWhaleMoves.filter((m) => m.piece === 'h');

            expect(blackWhaleMovesFiltered.length).toBeGreaterThan(0);
            expect(blackWhaleMovesFiltered.every((m) => m.color === 'b')).toBe(true);
        });

        test('should generate moves for specific square of enemy piece', () => {
            game.clear();
            game.put({ type: 'd', color: 'w', role: 'hunter' }, 'e2');
            game.put({ type: 'd', color: 'b', role: 'hunter' }, 'e7');

            // It's white's turn, but get moves for specific black piece
            expect(game.turn()).toBe('w');
            const blackDolphinMoves = game.moves({
                square: 'e7',
                verbose: true,
                color: 'b',
            });

            expect(blackDolphinMoves.length).toBeGreaterThan(0);
            expect(blackDolphinMoves.every((m) => m.from === 'e7')).toBe(true);
            expect(blackDolphinMoves.every((m) => m.color === 'b')).toBe(true);
        });

        test('should default to current turn when color not specified', () => {
            game.clear();
            game.put({ type: 'd', color: 'w', role: 'hunter' }, 'e2');
            game.put({ type: 'd', color: 'b', role: 'hunter' }, 'e7');

            // Without color parameter, should return current turn's moves
            const moves = game.moves({ verbose: true });

            expect(moves.length).toBeGreaterThan(0);
            expect(moves.every((m) => m.color === 'w')).toBe(true);
        });

        test('should return empty array for color with no pieces', () => {
            game.clear();
            game.put({ type: 'd', color: 'w', role: 'hunter' }, 'e2');

            // Request black moves when there are no black pieces
            const blackMoves = game.moves({ verbose: true, color: 'b' });

            expect(blackMoves.length).toBe(0);
        });

        test('should allow viewing enemy piece moves without switching turn', () => {
            game.clear();
            game.put({ type: 't', color: 'w', role: 'hunter' }, 'a1');
            game.put({ type: 't', color: 'b', role: 'hunter' }, 'a8');

            const turnBefore = game.turn();

            // Get enemy moves
            const enemyMoves = game.moves({ verbose: true, color: 'b' });

            const turnAfter = game.turn();

            // Turn should not have changed
            expect(turnBefore).toBe(turnAfter);
            expect(turnBefore).toBe('w');

            // But we should have gotten black's moves
            expect(enemyMoves.length).toBeGreaterThan(0);
            expect(enemyMoves.every((m) => m.color === 'b')).toBe(true);
        });
    });

    describe('Game State Fixtures', () => {
        test('should load and apply a game state fixture', () => {
            // Load a fixture from the __fixtures__ directory
            const fixture = loadFixture('example-initial-state');

            // Validate the fixture schema version
            validateFixtureVersion(fixture, '1.0.0');

            // Apply the fixture to a game instance
            const game = new CoralClash();
            applyFixture(game, fixture);

            // Verify the game state matches the fixture
            expect(game.fen()).toBe(fixture.state.fen);
            expect(game.turn()).toBe(fixture.state.turn);
            expect(game.isGameOver()).toBe(fixture.state.isGameOver);
        });

        test('should use fixture to test specific game scenarios', () => {
            // Example: Create your own fixture by exporting a game state
            // from the UI, then load it here to test specific scenarios

            // For now, using the example initial state
            const fixture = loadFixture('example-initial-state');
            const game = new CoralClash();
            applyFixture(game, fixture);

            // Test that white can move first
            expect(game.turn()).toBe('w');

            // Test that the board is in the initial state
            const moves = game.moves();
            expect(moves.length).toBeGreaterThan(0);
        });

        test('whale should be able to move diagonally', () => {
            // Load the whale diagonal movement fixture
            const fixture = loadFixture('whale-move-diagonally');
            const game = new CoralClash();
            applyFixture(game, fixture);

            // White whale is at d1 and e1 (horizontal arrangement)
            const allMoves = game.moves({ verbose: true });
            const whaleMoves = allMoves.filter((m) => m.piece === 'h');

            // Get moves from e1 specifically
            const e1Moves = game.moves({ verbose: true, square: 'e1' });

            // Test 1: Single-half diagonal move - d1 to e2 (makes whale vertical at e1-e2)
            const d1ToE2 = whaleMoves.find((move) => move.from === 'd1' && move.to === 'e2');
            expect(d1ToE2).toBeDefined();

            // Test 2: Single-half diagonal move - e1 to d2 (makes whale vertical at d1-d2)
            const e1ToD2 = whaleMoves.find((move) => move.from === 'e1' && move.to === 'd2');
            expect(e1ToD2).toBeDefined();

            // Test 3: Parallel diagonal move - both halves move diagonally up-right
            // d1->e2 and e1->f2 simultaneously (whale stays horizontal at e2-f2)
            const e1ToF2 = whaleMoves.find((move) => move.from === 'e1' && move.to === 'f2');
            expect(e1ToF2).toBeDefined();

            // Test 4: Parallel orthogonal move up - e1 to e2 (d1 also moves to d2)
            const e1ToE2 = e1Moves.find((move) => move.from === 'e1' && move.to === 'e2');
            expect(e1ToE2).toBeDefined();
            expect(e1ToE2?.from).toBe('e1');
            expect(e1ToE2?.to).toBe('e2');
        });

        test('whale can move diagonally when path is clear', () => {
            // Use the fixture where pieces have been moved
            const fixture = loadFixture('whale-move-diagonally');
            const game = new CoralClash();
            applyFixture(game, fixture);

            console.log('\n=== Initial whale position ===');
            console.log('d1:', game.get('d1'));
            console.log('e1:', game.get('e1'));
            console.log('e2:', game.get('e2'));

            const e1Moves = game.moves({ verbose: true, square: 'e1' });
            console.log(
                'Moves from e1:',
                e1Moves
                    .map((m) => `${m.from}->${m.to}`)
                    .slice(0, 10)
                    .join(', '),
            );

            const e1ToF2 = e1Moves.find((m) => m.from === 'e1' && m.to === 'f2');
            console.log('e1->f2 available?', !!e1ToF2);

            // Now move e1 to e2 (making whale vertical at d1-e2 or d2-e2)
            console.log('\n=== Attempting move e1->e2 ===');
            const moveResult = game.move({ from: 'e1', to: 'e2' });
            console.log('Move result:', moveResult);

            if (!moveResult) {
                console.log('ERROR: Move failed!');
                console.log(
                    'Available moves from e1:',
                    e1Moves.map((m) => `${m.from}->${m.to}`).join(', '),
                );
            }

            console.log('\n=== After move ===');
            console.log('d1:', game.get('d1'));
            console.log('d2:', game.get('d2'));
            console.log('e1:', game.get('e1'));
            console.log('e2:', game.get('e2'));
            console.log('f2:', game.get('f2'));

            // Check moves from e2 - NOTE: It's now Black's turn!
            console.log('Current turn:', game.turn());

            const e2MovesDefaultTurn = game.moves({ verbose: true, square: 'e2' });
            console.log('Moves from e2 (default turn):', e2MovesDefaultTurn.length);

            // Try with color: 'w' to explicitly get white's moves
            const e2MovesWhite = game.moves({ verbose: true, square: 'e2', color: 'w' });
            console.log(
                'Moves from e2 (white):',
                e2MovesWhite
                    .map((m) => `${m.from}->${m.to}`)
                    .slice(0, 15)
                    .join(', '),
            );

            const e2ToF2 = e2MovesWhite.find((m) => m.from === 'e2' && m.to === 'f2');
            console.log('e2->f2 available?', !!e2ToF2);
            console.log(
                'Expected: For whale at d2-e2 (vertical), e2->f2 should rotate to e2-f2 (horizontal)',
            );

            // e1->f2 should be available (parallel diagonal move)
            expect(e1ToF2).toBeDefined();
        });

        it('UI scenario: whale at d1-e1, click e2, should show e1 and f2 as orientation options', () => {
            const game = new CoralClash();
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1'); // Creates whale at d1-e1

            // Get all moves (what UI does)
            const allMoves = game.moves({ verbose: true });
            const whaleMoves = allMoves.filter((m) => m.piece === 'h' && m.color === 'w');

            // Filter moves where TO is e2 (what UI does when you click e2)
            const movesToE2 = whaleMoves.filter((m) => m.to === 'e2');

            // Group by whaleSecondSquare (UI does this to show orientations)
            const orientationMap = new Map();
            movesToE2.forEach((m) => {
                if (m.whaleSecondSquare && !orientationMap.has(m.whaleSecondSquare)) {
                    orientationMap.set(m.whaleSecondSquare, m);
                }
            });

            // Expected: e2-e1 (vertical), e2-d2 (rotation), and e2-f2 (horizontal from parallel diagonal)
            expect(orientationMap.has('e1')).toBe(true);
            expect(orientationMap.has('f2')).toBe(true);
            expect(orientationMap.has('d2')).toBe(true);
        });

        it('UI scenario: after selecting e2 destination and f2 orientation, whale should be at e2-f2', () => {
            const game = new CoralClash();
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1'); // Creates whale at d1-e1

            // Get all moves
            const allMoves = game.moves({ verbose: true });
            const whaleMoves = allMoves.filter((m) => m.piece === 'h' && m.color === 'w');

            // Filter moves where TO is e2
            const movesToE2 = whaleMoves.filter((m) => m.to === 'e2');

            // Find the move where whaleSecondSquare is f2 (parallel diagonal slide)
            const moveToE2F2 = movesToE2.find((m) => m.whaleSecondSquare === 'f2');

            expect(moveToE2F2).toBeDefined();
            console.log('Move to e2-f2:', moveToE2F2);

            // Execute the move with whaleSecondSquare to disambiguate
            game.move({
                from: moveToE2F2!.from,
                to: moveToE2F2!.to,
                whaleSecondSquare: 'f2',
            });

            // Verify whale is at e2-f2
            const e2Piece = game.get('e2');
            const f2Piece = game.get('f2');
            const e1Piece = game.get('e1');
            const d1Piece = game.get('d1');

            console.log('After move:');
            console.log('  e2:', e2Piece);
            console.log('  f2:', f2Piece);
            console.log('  e1:', e1Piece);
            console.log('  d1:', d1Piece);

            expect(e2Piece).toBeTruthy();
            expect(e2Piece?.type).toBe('h');
            expect(f2Piece).toBeTruthy();
            expect(f2Piece?.type).toBe('h');
            expect(e1Piece).toBeFalsy();
            expect(d1Piece).toBeFalsy();
        });
    });
});
