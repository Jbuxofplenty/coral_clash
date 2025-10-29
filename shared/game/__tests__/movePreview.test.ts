/**
 * Tests for move preview functionality
 * Ensures that previewing moves (generating moves for pieces) doesn't corrupt game state
 */

import checkNonTurnFixture from '../__fixtures__/check-non-turn.json';
import { CoralClash } from '../v1.0.0/coralClash.js';
import { applyFixture } from '../v1.0.0/gameState.js';

describe('Move Preview', () => {
    describe('Check status preservation', () => {
        it('should not affect check status when previewing enemy moves', () => {
            const game = new CoralClash();

            // Load fixture where it's black's turn (black is NOT in check)
            applyFixture(game, checkNonTurnFixture);

            // Verify initial state
            expect(game.turn()).toBe('b');
            const initialCheckStatus = game.inCheck();
            expect(initialCheckStatus).toBe(false); // Black is NOT in check in this position

            // Get the initial FEN to verify state isn't corrupted
            const initialFen = game.fen();

            // Preview moves for white octopus at f6 (enemy piece, not black's turn)
            // This was triggering the bug - showing "Black is in Check!" when viewing white's moves
            const whiteMoves = game.moves({ square: 'f6', verbose: true, color: 'w' });

            // Verify moves were generated
            expect(whiteMoves.length).toBeGreaterThan(0);

            // CRITICAL: Check status should be unchanged after previewing moves
            expect(game.inCheck()).toBe(initialCheckStatus);
            expect(game.turn()).toBe('b');

            // Game state should be identical
            expect(game.fen()).toBe(initialFen);
        });

        it('should not affect check status when previewing own moves', () => {
            const game = new CoralClash();

            // Load fixture
            applyFixture(game, checkNonTurnFixture);

            // Verify initial state
            expect(game.turn()).toBe('b');
            const initialCheckStatus = game.inCheck();

            const initialFen = game.fen();

            // Preview moves for black octopus at e7 (own piece, black's turn)
            const blackMoves = game.moves({ square: 'e7', verbose: true });

            // Verify moves were generated
            expect(blackMoves.length).toBeGreaterThan(0);

            // Check status should be unchanged
            expect(game.inCheck()).toBe(initialCheckStatus);
            expect(game.turn()).toBe('b');

            // Game state should be identical
            expect(game.fen()).toBe(initialFen);
        });

        it('should not corrupt whale positions when previewing moves', () => {
            const game = new CoralClash();

            applyFixture(game, checkNonTurnFixture);

            // Get initial whale positions
            const initialWhalePositions = game.whalePositions();

            // Preview moves for all pieces (including whales)
            const allMoves = game.moves({ verbose: true });

            // Verify moves were generated
            expect(allMoves.length).toBeGreaterThan(0);

            // Whale positions should be unchanged
            const afterWhalePositions = game.whalePositions();
            expect(afterWhalePositions).toEqual(initialWhalePositions);
        });

        it('should handle multiple sequential previews without corruption', () => {
            const game = new CoralClash();

            applyFixture(game, checkNonTurnFixture);

            const initialFen = game.fen();
            const initialCheck = game.inCheck();

            // Preview multiple pieces in sequence
            game.moves({ square: 'f6', verbose: true, color: 'w' }); // White octopus
            game.moves({ square: 'd3', verbose: true, color: 'w' }); // White octopus
            game.moves({ square: 'e7', verbose: true }); // Black octopus
            game.moves({ square: 'd6', verbose: true }); // Black octopus
            game.moves({ verbose: true }); // All black moves
            game.moves({ verbose: true, color: 'w' }); // All white moves

            // State should be completely unchanged
            expect(game.fen()).toBe(initialFen);
            expect(game.inCheck()).toBe(initialCheck);
            expect(game.turn()).toBe('b');
        });

        it('should correctly filter legal moves and preserve state', () => {
            const game = new CoralClash();

            applyFixture(game, checkNonTurnFixture);

            const initialCheckStatus = game.inCheck();

            // Get all legal moves for black
            const blackMoves = game.moves({ verbose: true });

            // All returned moves should be legal
            expect(blackMoves.length).toBeGreaterThan(0);

            // Verify each move is actually legal by making and undoing it
            blackMoves.forEach((move) => {
                const beforeFen = game.fen();
                game.move(move);
                expect(game.inCheck()).toBe(false); // After a legal move, current player should not be in check
                game.undo();
                expect(game.fen()).toBe(beforeFen); // State should be restored
            });

            // After all the make/undo cycles, state should be preserved
            expect(game.inCheck()).toBe(initialCheckStatus);
            expect(game.turn()).toBe('b');
        });
    });

    describe('Game state integrity', () => {
        it('should maintain coral state when previewing moves', () => {
            const game = new CoralClash();

            applyFixture(game, checkNonTurnFixture);

            // Get initial coral state
            const initialCoral = game.getAllCoral();
            const initialCoralRemaining = game.getCoralRemainingCounts();

            // Preview moves that could involve coral actions
            game.moves({ square: 'f6', verbose: true, color: 'w' });
            game.moves({ square: 'd3', verbose: true, color: 'w' });

            // Coral state should be unchanged
            expect(game.getAllCoral()).toEqual(initialCoral);
            expect(game.getCoralRemainingCounts()).toEqual(initialCoralRemaining);
        });

        it('should maintain board state when previewing all moves', () => {
            const game = new CoralClash();

            applyFixture(game, checkNonTurnFixture);

            // Get initial board state
            const initialBoard = JSON.stringify(game.board());

            // Preview all moves (including whale moves - complex 2-square piece)
            const allMoves = game.moves({ verbose: true });
            expect(allMoves.length).toBeGreaterThan(0);

            // Board should be unchanged
            expect(JSON.stringify(game.board())).toBe(initialBoard);
        });

        it('should maintain move history when previewing moves', () => {
            const game = new CoralClash();

            applyFixture(game, checkNonTurnFixture);

            // Get initial history
            const initialHistory = game.history();
            const initialHistoryLength = initialHistory.length;

            // Preview various moves
            game.moves({ verbose: true });
            game.moves({ square: 'f6', verbose: true, color: 'w' });
            game.moves({ piece: 'h', verbose: true, color: 'b' });

            // History should be unchanged
            expect(game.history().length).toBe(initialHistoryLength);
            expect(game.history()).toEqual(initialHistory);
        });
    });
});
