import whaleRotation3 from '../__fixtures__/whale-rotation-3.json';
import { CoralClash } from '../v1.0.0/coralClash';
import { applyFixture } from '../v1.0.0/gameState';

describe('Extended FEN Format', () => {
    describe('FEN Generation (Field 7-10)', () => {
        it('should include piece roles in field 7', () => {
            const game = new CoralClash();

            // Make a gatherer move
            game.move({ from: 'd3', to: 'c4', coralPlaced: true });

            const fen = game.fen();
            const fields = fen.split(' ');

            expect(fields.length).toBeGreaterThanOrEqual(7);
            expect(fields[6]).toContain('c4g'); // c4 has gatherer role
            expect(fields[6]).toContain('h'); // Should have some hunters
        });

        it('should include coral positions in field 8', () => {
            const game = new CoralClash();
            const fen = game.fen();
            const fields = fen.split(' ');

            expect(fields.length).toBeGreaterThanOrEqual(8);
            expect(fields[7]).toContain('d3w'); // Starting coral
            expect(fields[7]).toContain('e3w');
            expect(fields[7]).toContain('c7b');
        });

        it('should include coral remaining counts in field 9', () => {
            const game = new CoralClash();
            const fen = game.fen();
            const fields = fen.split(' ');

            expect(fields.length).toBeGreaterThanOrEqual(9);
            // After initialization, coral counts are 15,14 (white placed 2 and 1 at c7)
            const counts = fields[8].split(',');
            expect(counts).toHaveLength(2);
            expect(parseInt(counts[0])).toBeGreaterThan(0);
            expect(parseInt(counts[1])).toBeGreaterThan(0);
        });

        it('should include whale positions in field 10', () => {
            const game = new CoralClash();
            const fen = game.fen();
            const fields = fen.split(' ');

            expect(fields.length).toBe(10);
            expect(fields[9]).toContain('d1e1'); // White whale
            expect(fields[9]).toContain('d8e8'); // Black whale
            expect(fields[9]).toBe('d1e1,d8e8');
        });

        it('should update whale positions after rotation', () => {
            const game = new CoralClash();
            applyFixture(game, whaleRotation3);

            // Rotate whale to d2,d3
            game.move({
                from: 'e2',
                to: 'd3',
                whaleSecondSquare: 'd2',
                coralRemovedSquares: ['d3'],
            });

            const fen = game.fen();
            const fields = fen.split(' ');

            expect(fields[9]).toContain('d3d2'); // Whale at d3,d2 (vertical)
        });

        it('should handle empty coral field with dash', () => {
            const game = new CoralClash();

            // Remove all coral
            (game as any)._coral = new Array(128).fill(null);

            const fen = game.fen();
            const fields = fen.split(' ');

            expect(fields[7]).toBe('-');
        });
    });

    describe('FEN Parsing (Field 7-10)', () => {
        it('should parse piece roles from field 7', () => {
            const fen =
                'ftth1ttf/cocddcoc/3oo3/8/2O5/4O3/COCDDCOC/FTTH1TTF b - - 1 1 c4g,e3h - - -';
            const game = new CoralClash();
            game.load(fen);

            const c4Piece = game.get('c4');
            expect(c4Piece).toBeTruthy();
            if (c4Piece) {
                expect(c4Piece.role).toBe('gatherer');
            }

            const e3Piece = game.get('e3');
            expect(e3Piece).toBeTruthy();
            if (e3Piece) {
                expect(e3Piece.role).toBe('hunter');
            }
        });

        it('should parse coral positions from field 8', () => {
            const fen =
                'ftth1ttf/cocddcoc/3oo3/8/2O5/4O3/COCDDCOC/FTTH1TTF w - - 0 1 - d3w,e3w,c7b - -';
            const game = new CoralClash();
            game.load(fen);

            expect(game.getCoral('d3')).toBe('w');
            expect(game.getCoral('e3')).toBe('w');
            expect(game.getCoral('c7')).toBe('b');
        });

        it('should parse coral remaining counts from field 9', () => {
            const fen = 'ftth1ttf/cocddcoc/3oo3/8/2O5/4O3/COCDDCOC/FTTH1TTF w - - 0 1 - - 15,14 -';
            const game = new CoralClash();
            game.load(fen);

            const counts = game.getCoralRemainingCounts();
            expect(counts.w).toBe(15);
            expect(counts.b).toBe(14);
        });

        it('should parse whale positions from field 10', () => {
            const fen =
                'ftth1ttf/cocddcoc/3oo3/8/2O5/o2HO3/C4COC/1TT2TTF b - - 1 13 - - - d3d2,d7e7';
            const game = new CoralClash();
            game.load(fen);

            const whalePos = game.whalePositions();
            expect(whalePos.w).toEqual(['d3', 'd2']);
            expect(whalePos.b).toEqual(['d7', 'e7']);
        });

        it('should handle dash for missing optional fields', () => {
            const fen = 'ftth1ttf/cocddcoc/3oo3/8/8/3OO3/COCDDCOC/FTTH1TTF w - - 0 1 - - - -';
            const game = new CoralClash();
            game.load(fen);

            // Should not crash
            expect(game.fen()).toBeTruthy();
        });
    });

    describe('Round-Trip Testing', () => {
        it('should preserve all state through FEN round-trip', () => {
            const game1 = new CoralClash();

            // Make some moves to create interesting state
            game1.move({ from: 'd3', to: 'c4', coralPlaced: true });
            game1.move({ from: 'd6', to: 'c5' });

            const fen = game1.fen();

            // Load into new game
            const game2 = new CoralClash();
            game2.load(fen);

            // Verify everything matches
            expect(game2.fen()).toBe(fen);
            const c4Piece = game2.get('c4');
            if (c4Piece) {
                expect(c4Piece.role).toBe('gatherer');
            }
            const c5Piece = game2.get('c5');
            if (c5Piece) {
                expect(c5Piece.role).toBe('hunter');
            }
            expect(game2.getCoral('c4')).toBe('w'); // Coral placed at c4
            expect(game2.getCoral('d6')).toBe(game1.getCoral('d6')); // Should match
            expect(game2.getCoralRemainingCounts()).toEqual(game1.getCoralRemainingCounts());
            expect(game2.whalePositions()).toEqual(game1.whalePositions());
        });

        it('should preserve whale orientation through round-trip', () => {
            const game1 = new CoralClash();
            applyFixture(game1, whaleRotation3);

            // Rotate whale vertically
            game1.move({
                from: 'e2',
                to: 'd3',
                whaleSecondSquare: 'd2',
                coralRemovedSquares: ['d3'],
            });

            const fen1 = game1.fen();
            const whalePos1 = game1.whalePositions();

            // Load into new game
            const game2 = new CoralClash();
            game2.load(fen1);

            const fen2 = game2.fen();
            const whalePos2 = game2.whalePositions();

            expect(fen2).toBe(fen1);
            expect(whalePos2).toEqual(whalePos1);
            expect(whalePos2.w).toEqual(['d3', 'd2']); // Vertical orientation preserved
        });

        it('should preserve complex coral state', () => {
            const game1 = new CoralClash();

            // Create complex coral pattern with valid moves
            game1.move({ from: 'd3', to: 'c4', coralPlaced: true });
            game1.move({ from: 'd6', to: 'c5' });

            const fen = game1.fen();
            const coral1 = game1.getAllCoral();

            const game2 = new CoralClash();
            game2.load(fen);

            const coral2 = game2.getAllCoral();
            expect(coral2).toEqual(coral1);
        });
    });

    describe('Backward Compatibility', () => {
        it('should load old 6-field FEN format', () => {
            const oldFen = 'ftth1ttf/cocddcoc/3oo3/8/8/3OO3/COCDDCOC/FTTH1TTF w - - 0 1';
            const game = new CoralClash();

            expect(() => game.load(oldFen)).not.toThrow();

            // Should initialize with defaults
            const newFen = game.fen();
            expect(newFen.split(' ').length).toBe(10); // Extended format
        });

        it('should assign default roles for old FEN', () => {
            const oldFen = 'ftth1ttf/cocddcoc/3oo3/8/8/3OO3/COCDDCOC/FTTH1TTF w - - 0 1';
            const game = new CoralClash();
            game.load(oldFen);

            // Check some expected starting roles
            const c1Piece = game.get('c1');
            if (c1Piece) {
                expect(c1Piece.role).toBe('gatherer'); // Starting position role
            }

            const a1Piece = game.get('a1');
            if (a1Piece) {
                expect(a1Piece.role).toBe('hunter');
            }
        });

        it('should initialize default coral for old FEN at starting position', () => {
            const oldFen = 'ftth1ttf/cocddcoc/3oo3/8/8/3OO3/COCDDCOC/FTTH1TTF w - - 0 1';
            const game = new CoralClash();
            game.load(oldFen);

            expect(game.getCoral('d3')).toBe('w');
            expect(game.getCoral('e3')).toBe('w');
            expect(game.getCoral('c7')).toBe('b');
        });
    });

    describe('Whale SAN Disambiguation', () => {
        it('should add whale second square to SAN when ambiguous', () => {
            const game = new CoralClash();
            applyFixture(game, whaleRotation3);

            // Get all moves to d3 (there are multiple with different orientations)
            const moves = game.moves({ verbose: true, square: 'e2' });
            const movesToD3 = moves.filter((m: any) => m.to === 'd3');

            expect(movesToD3.length).toBeGreaterThan(1);

            // Find horizontal and vertical moves
            const horizontal = movesToD3.find(
                (m: any) =>
                    m.whaleSecondSquare === 'c3' &&
                    (!m.coralRemovedSquares || m.coralRemovedSquares.length === 0),
            );
            const vertical = movesToD3.find(
                (m: any) =>
                    m.whaleSecondSquare === 'd2' &&
                    (!m.coralRemovedSquares || m.coralRemovedSquares.length === 0),
            );

            // Both should exist and have different SANs
            if (horizontal && vertical) {
                expect(horizontal.san).toContain('c3'); // Should have disambiguator
                expect(vertical.san).toContain('d2'); // Should have disambiguator
                expect(horizontal.san).not.toBe(vertical.san); // Must be different
            } else {
                // At minimum, check that we have disambiguated SANs in the moves
                const sans = movesToD3.map((m: any) => m.san);
                expect(sans.some((san) => san.includes('c3') || san.includes('d2'))).toBe(true);
            }
        });

        it('should parse disambiguated whale SAN correctly', () => {
            const game = new CoralClash();
            applyFixture(game, whaleRotation3);

            // Make move with disambiguation
            const move = game.move('Hd2d3~d3');

            expect(move).toBeTruthy();
            expect(move.to).toBe('d3');
            expect(move.whaleSecondSquare).toBe('d2');
            expect(game.whalePositions().w).toEqual(['d3', 'd2']);
        });

        it('should generate correct SAN for whale coral removal', () => {
            const game = new CoralClash();
            applyFixture(game, whaleRotation3);

            const move = game.move({
                from: 'e2',
                to: 'd3',
                whaleSecondSquare: 'd2',
                coralRemovedSquares: ['d3'],
            });

            expect(move.san).toContain('d2'); // Disambiguator
            expect(move.san).toContain('d3'); // Destination
            expect(move.san).toContain('~d3'); // Coral removal
        });
    });

    describe('Edge Cases', () => {
        it('should handle FEN with only some extended fields', () => {
            const fen =
                'ftth1ttf/cocddcoc/3oo3/8/2O5/4O3/COCDDCOC/FTTH1TTF b - - 1 1 c4g,d3h - - -';
            const game = new CoralClash();
            game.load(fen);

            const c4Piece = game.get('c4');
            if (c4Piece) {
                expect(c4Piece.role).toBe('gatherer');
            }
            // Coral and whale should use defaults
        });

        it('should handle empty whale after capture', () => {
            const game = new CoralClash();

            // Simulate whale capture (for testing - not actually possible in game)
            (game as any)._kings.w = [-1, -1];

            const fen = game.fen();
            const fields = fen.split(' ');

            // Should only have black whale
            expect(fields[9]).not.toContain('d1e1');
            expect(fields[9]).toContain('d8e8');
        });

        it('should handle very long role list', () => {
            const game = new CoralClash();

            // Every piece has a role in starting position
            const fen = game.fen();
            const fields = fen.split(' ');

            const roles = fields[6].split(',');
            expect(roles.length).toBeGreaterThan(20); // Should have many roles
        });

        it('should preserve state after multiple moves and undos', () => {
            const game = new CoralClash();

            // Make moves
            const move1 = game.move({ from: 'd3', to: 'c4', coralPlaced: true });
            const move2 = game.move({ from: 'd6', to: 'c5' });

            const fen1 = game.fen();

            // Undo
            game.undo();
            game.undo();

            // Redo
            game.move(move1);
            game.move(move2);

            const fen2 = game.fen();

            expect(fen2).toBe(fen1);
        });
    });
});
