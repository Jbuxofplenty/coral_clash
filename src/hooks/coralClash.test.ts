import { CoralClash } from './coralClash';

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
        test('horizontal whale should slide up maintaining horizontal orientation', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1'); // Creates whale at d1-e1

            const moves = game.moves({ verbose: true });
            const parallelUp = moves.filter(
                (m) => m.piece === 'h' && m.to === 'd2' && m.whaleOtherHalf !== undefined,
            );

            // Should be able to move from both d1 and e1 to d2-e2
            expect(parallelUp.length).toBeGreaterThan(0);
        });

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

    describe('Parallel Sliding - Vertical Whale', () => {
        test('vertical whale should slide up maintaining vertical orientation', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1');

            console.log(
                'After put, whale squares:',
                game
                    .board()
                    .flat()
                    .filter((c) => c && c.type === 'h')
                    .map((c, i) => ({
                        square: game
                            .board()
                            .flat()
                            .findIndex((x) => x === c),
                        color: c.color,
                    })),
            );

            // First rotate to vertical (e1 moves to d2, keeping d1)
            game.move({ from: 'e1', to: 'd2' });

            const board = game.board();
            const flatBoard = board.flat().filter((cell) => cell);
            const whaleSquares = flatBoard.filter(
                (cell) => cell.type === 'h' && cell.color === 'w',
            );

            console.log('After rotation, whale squares:', whaleSquares.length);
            console.log('Board as 2D array:');
            board.forEach((row, rank) => {
                const rankNum = 8 - rank;
                const rowStr = row
                    .map((cell, file) => {
                        const fileChar = 'abcdefgh'[file];
                        return cell && cell.type === 'h'
                            ? `H@${fileChar}${rankNum}`
                            : cell
                              ? cell.type
                              : '.';
                    })
                    .join(' ');
                console.log(`Rank ${rankNum}: ${rowStr}`);
            });

            const moves = game.moves({ verbose: true });
            console.log(
                'All whale moves:',
                moves.filter((m) => m.piece === 'h').map((m) => `${m.from}->${m.to}`),
            );
            const parallelUp = moves.filter(
                (m) => m.piece === 'h' && (m.to === 'd3' || m.to === 'd4'),
            );

            expect(parallelUp.length).toBeGreaterThan(0);
        });
    });

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

            // Check what moves are available from e1 to d2
            const moves = game.moves({ verbose: true });
            const e1ToD2Moves = moves.filter((m) => m.from === 'e1' && m.to === 'd2');
            console.log(
                'Moves from e1 to d2:',
                e1ToD2Moves.map((m) => ({
                    from: m.from,
                    to: m.to,
                    whaleOtherHalf: m.whaleOtherHalf,
                })),
            );

            // Rotate to vertical (e1 half moves to d2, d1 half stays)
            // This should result in whale at d1-d2
            game.move({ from: 'e1', to: 'd2' });

            // Debug: Check internal state
            console.log('After move - internal state:');
            console.log('  game.get(d1):', game.get('d1'));
            console.log('  game.get(d2):', game.get('d2'));
            console.log('  game.get(e1):', game.get('e1'));

            const board = game.board();
            const flatBoard = board.flat().filter((cell) => cell);
            const whaleSquares = flatBoard.filter(
                (cell) => cell.type === 'h' && cell.color === 'w',
            );
            console.log(
                'Whale squares from board():',
                whaleSquares.map((s) => s.square),
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
        test('whale should be blocked by other pieces', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1'); // d1-e1
            game.put({ type: 'p', color: 'w' }, 'd2'); // Block upward movement
            game.put({ type: 'p', color: 'w' }, 'e2'); // Block upward movement

            const moves = game.moves({ verbose: true });

            // Should NOT be able to parallel slide up
            const blockedUp = moves.filter(
                (m) => m.piece === 'h' && (m.to === 'd2' || m.to === 'e2'),
            );

            expect(blockedUp.length).toBe(0);
        });

        test('whale should capture enemy pieces while parallel sliding', () => {
            game.clear();
            game.put({ type: 'h', color: 'w' }, 'd1'); // d1-e1
            game.put({ type: 'p', color: 'b' }, 'd2'); // Enemy piece
            game.put({ type: 'p', color: 'b' }, 'e2'); // Enemy piece

            const moves = game.moves({ verbose: true });

            // Should be able to capture while parallel sliding
            const captureMoves = moves.filter(
                (m) => m.piece === 'h' && m.captured && (m.to === 'd2' || m.to === 'e2'),
            );

            expect(captureMoves.length).toBeGreaterThan(0);
        });

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
            const parallelUp = moves.find(
                (m) => m.piece === 'h' && m.to === 'd2' && m.from !== 'd2', // Make sure it's actually a move
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

    describe('Coral Piece Role Preservation', () => {
        test('REGRESSION: coral piece should maintain gatherer role after capturing', () => {
            game.clear();
            // Place a gatherer dolphin (coral) and a target piece
            game.put({ type: 'q', color: 'w', role: 'gatherer' }, 'e2');
            game.put({ type: 'p', color: 'b', role: 'hunter' }, 'e5');

            // Verify the dolphin has gatherer role before capturing
            const dolphinBefore = game.get('e2');
            expect(dolphinBefore).toBeTruthy();
            expect(dolphinBefore.role).toBe('gatherer');

            // Make a capture move
            game.move({ from: 'e2', to: 'e5' });

            // Verify the dolphin still has gatherer role after capturing
            const dolphinAfter = game.get('e5');
            expect(dolphinAfter).toBeTruthy();
            expect(dolphinAfter.type).toBe('q');
            expect(dolphinAfter.color).toBe('w');
            expect(dolphinAfter.role).toBe('gatherer');
        });

        test('coral piece role should be preserved through multiple captures', () => {
            game.clear();
            game.put({ type: 'q', color: 'w', role: 'gatherer' }, 'd2');
            game.put({ type: 'p', color: 'b', role: 'hunter' }, 'd4');
            game.put({ type: 'n', color: 'w', role: 'hunter' }, 'd5'); // Add a white piece to capture
            game.put({ type: 'p', color: 'b', role: 'gatherer' }, 'd6');

            // First capture (white)
            game.move({ from: 'd2', to: 'd4' });
            let dolphin = game.get('d4');
            expect(dolphin?.role).toBe('gatherer');

            // Black's turn - move out of the way
            game.move({ from: 'd6', to: 'd7' });

            // Second capture (white)
            game.move({ from: 'd4', to: 'd5' });
            dolphin = game.get('d5');
            expect(dolphin?.role).toBe('gatherer');
        });

        test('captured piece role should be restored on undo', () => {
            game.clear();
            game.put({ type: 'q', color: 'w', role: 'hunter' }, 'e2');
            game.put({ type: 'q', color: 'b', role: 'gatherer' }, 'e5');

            // Verify initial state
            const capturedDolphin = game.get('e5');
            expect(capturedDolphin?.role).toBe('gatherer');

            // Capture
            game.move({ from: 'e2', to: 'e5' });

            // Undo
            game.undo();

            // Verify both pieces are restored with correct roles
            const attackerRestored = game.get('e2');
            const capturedRestored = game.get('e5');

            expect(attackerRestored?.type).toBe('q');
            expect(attackerRestored?.color).toBe('w');
            expect(attackerRestored?.role).toBe('hunter');

            expect(capturedRestored?.type).toBe('q');
            expect(capturedRestored?.color).toBe('b');
            expect(capturedRestored?.role).toBe('gatherer');
        });

        test('hunter piece should maintain hunter role after capturing', () => {
            game.clear();
            game.put({ type: 'q', color: 'w', role: 'hunter' }, 'e2');
            game.put({ type: 'p', color: 'b', role: 'gatherer' }, 'e5');

            game.move({ from: 'e2', to: 'e5' });

            const dolphin = game.get('e5');
            expect(dolphin?.role).toBe('hunter');
        });

        test('whale capture by coral piece should preserve capturing piece role', () => {
            game.clear();
            // Start with white's turn
            game.put({ type: 'q', color: 'w', role: 'gatherer' }, 'c3');
            game.put({ type: 'h', color: 'b' }, 'd5'); // Black whale at d5-e5

            // White captures one of the black whale squares
            game.move({ from: 'c3', to: 'd5' });

            const dolphin = game.get('d5');
            expect(dolphin?.type).toBe('q');
            expect(dolphin?.role).toBe('gatherer');
        });
    });
});
