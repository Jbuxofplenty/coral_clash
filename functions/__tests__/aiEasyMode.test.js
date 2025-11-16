import { CoralClash, createGameSnapshot } from '@jbuxofplenty/coral-clash';
import { findBestMove, evaluatePosition } from '../utils/aiEvaluation.js';

/**
 * AI Easy Mode Comprehensive Tests
 * - Determinism: same input -> same move
 * - Legality: chosen move exists in legal set
 * - AI vs AI: 2 full moves (4 plies) without errors
 * - Mutation safety: findBestMove doesn't mutate the snapshot
 * - Color consistency: returns a move for the side to move, regardless of evaluation color
 * - Nodes Evaluated: search returns non-zero explored nodes implicitly by score/behavior
 */

describe('AI Easy Mode - Comprehensive', () => {
    const EASY_DEPTH = 3;

    function applyFirstWhiteMove(game) {
        const whiteMoves = game.moves({ verbose: true });
        expect(whiteMoves.length).toBeGreaterThan(0);
        const firstWhiteMove = whiteMoves[0];
        const applied = game.move({
            from: firstWhiteMove.from,
            to: firstWhiteMove.to,
            promotion: firstWhiteMove.promotion,
            coralPlaced: firstWhiteMove.coralPlaced,
            coralRemoved: firstWhiteMove.coralRemoved,
            coralRemovedSquares: firstWhiteMove.coralRemovedSquares,
        });
        expect(applied).toBeTruthy();
    }

    test('Determinism on same position (two calls -> same move)', () => {
        const game = new CoralClash();
        applyFirstWhiteMove(game); // now black to move

        const snapshot = createGameSnapshot(game);
        const a = findBestMove(snapshot, EASY_DEPTH, 'b');
        const b = findBestMove(snapshot, EASY_DEPTH, 'b');

        expect(a.move).toBeTruthy();
        expect(b.move).toBeTruthy();
        expect(a.move.from).toBe(b.move.from);
        expect(a.move.to).toBe(b.move.to);
        expect((a.move.promotion || null)).toBe((b.move.promotion || null));
        expect(Boolean(a.move.coralPlaced)).toBe(Boolean(b.move.coralPlaced));
        expect(Boolean(a.move.coralRemoved)).toBe(Boolean(b.move.coralRemoved));
        // Optional: scores should match too
        expect(a.score).toBe(b.score);
    });

    test('Chosen move is legal for the side to move', () => {
        const game = new CoralClash();
        applyFirstWhiteMove(game); // black to move

        const snapshot = createGameSnapshot(game);
        const result = findBestMove(snapshot, EASY_DEPTH, 'b');
        expect(result.move).toBeTruthy();

        const legalBlackMoves = game.moves({ verbose: true });
        const isLegal = legalBlackMoves.some((m) =>
            m.from === result.move.from &&
            m.to === result.move.to &&
            (m.promotion || null) === (result.move.promotion || null) &&
            Boolean(m.coralPlaced) === Boolean(result.move.coralPlaced) &&
            Boolean(m.coralRemoved) === Boolean(result.move.coralRemoved)
        );
        expect(isLegal).toBe(true);
    });

    test('AI vs AI plays two full moves (4 plies) without errors', () => {
        const game = new CoralClash();

        const totalPlies = 4;
        for (let ply = 0; ply < totalPlies; ply++) {
            const currentColor = game.turn();
            const snapshot = createGameSnapshot(game);
            const result = findBestMove(snapshot, EASY_DEPTH, currentColor);

            expect(result.move).toBeTruthy();

            const legalMoves = game.moves({ verbose: true });
            const isLegal = legalMoves.some((m) =>
                m.from === result.move.from &&
                m.to === result.move.to &&
                (m.promotion || null) === (result.move.promotion || null) &&
                Boolean(m.coralPlaced) === Boolean(result.move.coralPlaced) &&
                Boolean(m.coralRemoved) === Boolean(result.move.coralRemoved)
            );
            expect(isLegal).toBe(true);

            const applied = game.move({
                from: result.move.from,
                to: result.move.to,
                promotion: result.move.promotion,
                coralPlaced: result.move.coralPlaced,
                coralRemoved: result.move.coralRemoved,
                coralRemovedSquares: result.move.coralRemovedSquares,
            });
            expect(applied).toBeTruthy();

            expect(() => createGameSnapshot(game)).not.toThrow();
        }

        expect(typeof game.fen()).toBe('string');
    });

    test("findBestMove doesn't mutate the provided snapshot", () => {
        const game = new CoralClash();
        applyFirstWhiteMove(game);
        const snapshotBefore = createGameSnapshot(game);

        const serializedBefore = JSON.stringify(snapshotBefore);
        const _res = findBestMove(snapshotBefore, EASY_DEPTH, 'b');
        const serializedAfter = JSON.stringify(snapshotBefore);

        expect(serializedAfter).toBe(serializedBefore);
    });

    test('Color parameter consistency: move belongs to side-to-move, regardless of evaluation color', () => {
        const game = new CoralClash();
        applyFirstWhiteMove(game); // black to move
        const snapshot = createGameSnapshot(game);

        const resultAsBlack = findBestMove(snapshot, EASY_DEPTH, 'b');
        const resultAsWhite = findBestMove(snapshot, EASY_DEPTH, 'w');

        // Both should return a legal move for the side to move (black)
        const legalBlackMoves = game.moves({ verbose: true });
        const isLegalBlack = (mv) => legalBlackMoves.some((m) =>
            m.from === mv.from &&
            m.to === mv.to &&
            (m.promotion || null) === (mv.promotion || null) &&
            Boolean(m.coralPlaced) === Boolean(mv.coralPlaced) &&
            Boolean(m.coralRemoved) === Boolean(mv.coralRemoved)
        );

        expect(isLegalBlack(resultAsBlack.move)).toBe(true);
        expect(isLegalBlack(resultAsWhite.move)).toBe(true);
    });

    test('Evaluation returns a numeric score and is stable across repeated calls', () => {
        const game = new CoralClash();
        applyFirstWhiteMove(game);
        const snapshot = createGameSnapshot(game);

        const s1 = evaluatePosition(snapshot, 'b');
        const s2 = evaluatePosition(snapshot, 'b');
        expect(typeof s1).toBe('number');
        expect(s1).toBe(s2);
    });
});
