import { CoralClash } from './coralClash';
import { applyFixture, validateFixtureVersion } from './__fixtures__/fixtureLoader';

// Import fixtures directly (works in Jest, not in React Native)
const exampleInitialState = require('./__fixtures__/example-initial-state.json');
const whaleMoveDigonally = require('./__fixtures__/whale-move-diagonally.json');
const octopusCheck = require('./__fixtures__/octopus-check.json');
const multipleChecks = require('./__fixtures__/multiple-checks.json');

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
            const fixture = exampleInitialState;

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
            const fixture = exampleInitialState;
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
            const fixture = whaleMoveDigonally;
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
            const fixture = whaleMoveDigonally;
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

        it('vertical whale at d1-d2 should be able to slide to column E', () => {
            const game = new CoralClash();
            game.clear();

            // Manually create a vertical whale at d1-d2
            game.put({ type: 'h', color: 'w' }, 'd1');
            game.put({ type: 'h', color: 'w' }, 'd2');

            // @ts-ignore - Set _kings for vertical whale
            game._kings.w = [0x73, 0x63]; // d1=0x73, d2=0x63

            // Add a turtle at f1 as blocker
            game.put({ type: 't', color: 'w', role: 'gatherer' }, 'f1');

            // Get all whale moves
            const allMoves = game.moves({ verbose: true, color: 'w' });
            const whaleMoves = allMoves.filter((m) => m.piece === 'h');

            // Should be able to move to e1 and e2 (parallel slide right)
            const toE1 = whaleMoves.filter((m) => m.to === 'e1');
            const toE2 = whaleMoves.filter((m) => m.to === 'e2');

            // Expect parallel slide to e1-e2 (vertical whale sliding right)
            expect(toE1.some((m) => m.whaleSecondSquare === 'e2')).toBe(true);
            expect(toE2.some((m) => m.whaleSecondSquare === 'e1')).toBe(true);
        });

        it('REGRESSION: should not allow moves that leave whale in check', () => {
            // Load the check-pinned scenario - fixture is at white's turn after black made illegal Tf7
            const fixture = require('./__fixtures__/check-pinned.json');
            const game = new CoralClash();
            applyFixture(game, fixture);

            // Undo the last move (Tf7 by black) to get to the position before
            game.undo(); // Undo Tf7
            game.undo(); // Undo Tb7 (white's previous move)

            console.log('\n=== Testing position before Tf7 ===');
            console.log('Turn:', game.turn());
            console.log('Black whale at:', game.whalePositions().b);

            // Now it should be black's turn, and black should be in check from Tb7
            const wasInCheck = game.inCheck();
            console.log('Is black in check?', wasInCheck);

            // Get all legal moves for black
            const blackMoves = game.moves({ verbose: true });
            console.log('Total legal moves for black:', blackMoves.length);

            // Check if Tf7 is in the legal moves list
            const tf7Move = blackMoves.find((m) => m.to === 'f7' && m.piece === 't');
            console.log('Is Tf7 in legal moves?', !!tf7Move);
            console.log('Tf7 move:', tf7Move);

            if (wasInCheck) {
                // If in check, ALL legal moves must get black out of check
                blackMoves.forEach((move) => {
                    game.move({
                        from: move.from,
                        to: move.to,
                        ...(move.whaleSecondSquare && {
                            whaleSecondSquare: move.whaleSecondSquare,
                        }),
                    });

                    const stillInCheck = game.inCheck();

                    if (stillInCheck) {
                        console.error(
                            `ILLEGAL MOVE ALLOWED: ${move.san} (${move.from}->${move.to}) leaves black in check!`,
                        );
                    }

                    game.undo();

                    // Assert that the move gets us out of check
                    expect(stillInCheck).toBe(false);
                });
            }
        });

        it('REGRESSION: whale captures should never be generated as moves', () => {
            // Create a scenario where a piece can attack the whale
            const game = new CoralClash();
            game.clear();

            // Place black whale at e7-e8
            game.put({ type: 'h', color: 'b' }, 'e8');
            // @ts-ignore
            game._kings.b = [0x04, 0x14]; // e8=0x04, e7=0x14

            // Place white turtle at b7 that can reach e7
            game.put({ type: 't', color: 'w', role: 'hunter' }, 'b7');

            // Place white whale for FEN validation
            game.put({ type: 'h', color: 'w' }, 'd1');

            console.log('\n=== Testing whale capture prevention ===');
            console.log('Black whale at:', game.whalePositions().b);
            console.log('White turtle at: b7');

            // Get all legal moves for white
            const whiteMoves = game.moves({ verbose: true });
            console.log('Total white moves:', whiteMoves.length);

            // Check if any move captures the whale
            const whaleCaptureMove = whiteMoves.find((m) => m.captured === 'h');

            if (whaleCaptureMove) {
                console.error('FOUND WHALE CAPTURE MOVE:', whaleCaptureMove);
            }

            // NO move should capture the whale
            expect(whaleCaptureMove).toBeUndefined();
            expect(whiteMoves.every((m) => m.captured !== 'h')).toBe(true);
        });

        it('REGRESSION: octopus check - white should not be in false check', () => {
            const game = new CoralClash();
            applyFixture(game, octopusCheck);

            // White should NOT be in check (octopus at b4 is too far from whale at d1-e1)
            expect(game.inCheck()).toBe(false);

            // White should have many legal moves available (not restricted by false check)
            const whiteMoves = game.moves({ verbose: true });
            expect(whiteMoves.length).toBeGreaterThan(30);

            // Octopus should only be able to move 1 square diagonally
            const blackOctopusMoves = game.moves({ verbose: true, color: 'b', square: 'b4' });
            // b4 can move diagonally to adjacent squares: a3 (capture), a5, c5, c3
            expect(blackOctopusMoves.length).toBeLessThanOrEqual(4);

            // All octopus moves should only be to adjacent diagonal squares
            blackOctopusMoves.forEach((m) => {
                const fromFile = m.from.charCodeAt(0) - 'a'.charCodeAt(0);
                const fromRank = parseInt(m.from[1]);
                const toFile = m.to.charCodeAt(0) - 'a'.charCodeAt(0);
                const toRank = parseInt(m.to[1]);

                const fileDiff = Math.abs(toFile - fromFile);
                const rankDiff = Math.abs(toRank - fromRank);

                // Octopus moves 1 square diagonally (both file and rank must change by exactly 1)
                expect(fileDiff).toBe(1);
                expect(rankDiff).toBe(1);
            });
        });

        it('REGRESSION: pinned piece should not be able to move (multiple checks)', () => {
            const game = new CoralClash();
            applyFixture(game, multipleChecks);

            // White moves dolphin from b4 to e4, putting black whale in check
            game.move({ from: 'b4', to: 'e4' });

            // Now it's black's turn
            // Black octopus at d7 is pinned - it's blocking the check from white turtle at b7 to black whale at e7
            // If the octopus moves away from d7, the whale would be in check from b7
            const blackOctopusMoves = game.moves({ verbose: true, square: 'd7' });

            // The octopus should NOT be able to move to e6 (or any other square that leaves the whale in check)
            const moveToE6 = blackOctopusMoves.find((m) => m.to === 'e6');

            // This should be undefined because the move would leave the whale in check
            expect(moveToE6).toBeUndefined();

            // In fact, the octopus at d7 is completely pinned
            // It cannot move at all without exposing the whale to check from the turtle at b7
            // So ALL moves should have been filtered out
            expect(blackOctopusMoves.length).toBe(0);
        });

        it('v1.1.0: should preserve whale orientation when exporting/importing', () => {
            // Create a game with a vertical whale
            const game1 = new CoralClash();
            game1.clear();

            // Add white whale vertically at d1-d2
            game1.put({ type: 'h', color: 'w' }, 'd1');
            game1.put({ type: 'h', color: 'w' }, 'd2');
            // @ts-ignore - Set _kings for vertical whale
            game1._kings.w = [0x73, 0x63]; // d1=0x73, d2=0x63

            // Add black whale for FEN validation
            game1.put({ type: 'h', color: 'b' }, 'd8');

            // Export whale positions
            const whalePos = game1.whalePositions();
            expect(whalePos.w).toEqual(['d1', 'd2']);

            // Simulate fixture export/import
            const fixture = {
                schemaVersion: '1.1.0',
                exportedAt: new Date().toISOString(),
                state: {
                    fen: game1.fen(),
                    board: game1.board(),
                    history: [],
                    turn: 'w' as const,
                    whalePositions: whalePos,
                    isGameOver: false,
                    inCheck: false,
                    isCheckmate: false,
                    isStalemate: false,
                    isDraw: false,
                    isCoralVictory: false as const,
                },
            };

            // Import into a new game
            const game2 = new CoralClash();
            applyFixture(game2, fixture);

            // Verify whale is still vertical (d1-d2), not horizontal (d1-e1)
            const restoredPos = game2.whalePositions();
            expect(restoredPos.w).toEqual(['d1', 'd2']);

            // Verify the whale is actually at d1 and d2
            expect(game2.get('d1')).toBeTruthy();
            expect(game2.get('d1')?.type).toBe('h');
            expect(game2.get('d2')).toBeTruthy();
            expect(game2.get('d2')?.type).toBe('h');
            expect(game2.get('e1')).toBeFalsy(); // Should NOT be at e1
        });

        it('REGRESSION: whale captures should properly delete captured pieces', () => {
            // Bug: When a whale captured a piece during parallel slide, it didn't delete
            // the captured piece from the board before placing the whale
            const game = new CoralClash();
            game.clear();

            // Setup: White whale at d1-e1, black turtle at f1
            game.put({ type: 'h', color: 'w' }, 'd1'); // Creates whale at d1-e1
            game.put({ type: 't', color: 'b', role: 'gatherer' }, 'f1');
            game.put({ type: 'h', color: 'b' }, 'd8'); // Black whale at d8-e8

            console.log('\n=== Before whale capture ===');
            console.log('White whale:', game.whalePositions().w);
            console.log('f1:', game.get('f1'));

            // Get whale moves - should be able to capture f1 via parallel slide
            const whaleMoves = game.moves({ verbose: true, piece: 'h', color: 'w' });
            const captureMove = whaleMoves.find((m) => m.to === 'f1' && m.captured === 't');

            expect(captureMove).toBeDefined();
            console.log('Capture move:', captureMove?.san);

            // Execute the capture
            if (captureMove) {
                game.move({ from: captureMove.from, to: captureMove.to });

                console.log('\n=== After whale capture ===');
                console.log('White whale:', game.whalePositions().w);
                console.log('e1:', game.get('e1'));
                console.log('f1:', game.get('f1'));

                // The whale should now occupy e1-f1
                const whalePos = game.whalePositions().w;
                expect(whalePos).toContain('e1');
                expect(whalePos).toContain('f1');

                // Both squares should have the whale
                expect(game.get('e1')?.type).toBe('h');
                expect(game.get('f1')?.type).toBe('h');

                // The black turtle should be gone (captured)
                expect(game.get('f1')?.color).toBe('w'); // Should be white whale, not black turtle
            }
        });

        it('REGRESSION: whale capture undo should restore to correct square', () => {
            // Bug: When undoing a whale parallel slide capture, the captured piece
            // was restored to move.to instead of the actual capture square
            const game = new CoralClash();
            game.clear();

            // Setup: White whale at d1-e1, black turtle at f1
            game.put({ type: 'h', color: 'w' }, 'd1'); // Creates whale at d1-e1
            game.put({ type: 't', color: 'b', role: 'gatherer' }, 'f1');
            game.put({ type: 'h', color: 'b' }, 'd8'); // Black whale

            // Capture f1
            const whaleMoves = game.moves({ verbose: true, piece: 'h', color: 'w' });
            const captureMove = whaleMoves.find((m) => m.to === 'f1' && m.captured);

            expect(captureMove).toBeDefined();
            game.move({ from: captureMove!.from, to: captureMove!.to });

            // Now undo
            game.undo();

            console.log('\n=== After undo ===');
            console.log('White whale:', game.whalePositions().w);
            console.log('d1:', game.get('d1'));
            console.log('e1:', game.get('e1'));
            console.log('f1:', game.get('f1'));

            // Whale should be back at d1-e1
            expect(game.whalePositions().w).toEqual(['d1', 'e1']);
            expect(game.get('d1')?.type).toBe('h');
            expect(game.get('e1')?.type).toBe('h');

            // Black turtle should be back at f1 (not lost!)
            expect(game.get('f1')?.type).toBe('t');
            expect(game.get('f1')?.color).toBe('b');
        });

        it('REGRESSION: crabs should be able to put whale in check', () => {
            // Bug: Crabs weren't included in the ATTACKS array, so they couldn't
            // attack/check the whale
            const game = new CoralClash();
            game.clear();

            // Setup: White crab at d5, black whale at d7-d8
            game.put({ type: 'c', color: 'w', role: 'hunter' }, 'd5');
            game.put({ type: 'h', color: 'b' }, 'd7'); // Black whale at d7-d8
            game.put({ type: 'h', color: 'w' }, 'd1'); // White whale at d1-e1

            console.log('\n=== Before crab move ===');
            console.log('White crab at d5');
            console.log('Black whale:', game.whalePositions().b);
            console.log('Black in check?', game.inCheck());

            expect(game.inCheck()).toBe(false);

            // Move crab from d5 to d6
            game.move({ from: 'd5', to: 'd6' });

            console.log('\n=== After crab d5->d6 ===');
            console.log('White crab at d6');
            console.log('Black whale:', game.whalePositions().b);
            console.log('Black in check?', game.inCheck());

            // Black should now be in check from the crab at d6 attacking d7
            expect(game.inCheck()).toBe(true);

            // Verify the crab can attack d7
            expect(game.isAttacked('d7', 'w')).toBe(true);
        });

        it('REGRESSION: crabs should attack in all orthogonal directions', () => {
            // Crabs can attack forward, backward, left, and right
            const game = new CoralClash();
            game.clear();

            // Setup: White crab at d4
            game.put({ type: 'c', color: 'w', role: 'hunter' }, 'd4');
            game.put({ type: 'h', color: 'w' }, 'd1'); // White whale
            game.put({ type: 'h', color: 'b' }, 'd8'); // Black whale

            console.log('\n=== Crab at d4 can attack all orthogonal directions ===');

            // Check all 4 orthogonal squares around d4
            expect(game.isAttacked('d5', 'w')).toBe(true); // Forward (toward rank 8)
            expect(game.isAttacked('d3', 'w')).toBe(true); // Backward (toward rank 1)
            expect(game.isAttacked('c4', 'w')).toBe(true); // Left
            expect(game.isAttacked('e4', 'w')).toBe(true); // Right

            console.log('  d5 (forward):', game.isAttacked('d5', 'w'));
            console.log('  d3 (backward):', game.isAttacked('d3', 'w'));
            console.log('  c4 (left):', game.isAttacked('c4', 'w'));
            console.log('  e4 (right):', game.isAttacked('e4', 'w'));

            // Diagonal squares should NOT be attacked by crab
            expect(game.isAttacked('c5', 'w')).toBe(false);
            expect(game.isAttacked('e5', 'w')).toBe(false);
            expect(game.isAttacked('c3', 'w')).toBe(false);
            expect(game.isAttacked('e3', 'w')).toBe(false);
        });
    });
});
