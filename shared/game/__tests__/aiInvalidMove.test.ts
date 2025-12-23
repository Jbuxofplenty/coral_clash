import aiTest1 from '../__fixtures__/ai-test-1.json';
import { findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';
import { CoralClash } from '../v1.0.0/coralClash';
import { applyFixture, createGameSnapshot } from '../v1.0.0/gameState';

describe('AI Invalid Move Bug', () => {
    jest.setTimeout(30000);

    it('should not return invalid move from f7 to f8 with coralPlaced for hard difficulty', () => {
        const game = new CoralClash();

        // Load the fixture state (black's turn)
        applyFixture(game, aiTest1);

        // Verify the game state is correct
        expect(game.turn()).toBe('b'); // Black's turn
        const f7Piece = game.get('f7');
        expect(f7Piece).toBeTruthy();
        if (f7Piece) {
            expect(f7Piece.type).toBe('c'); // Crab
            expect(f7Piece.role).toBe('gatherer');
        }

        const f8Piece = game.get('f8');
        expect(f8Piece).toBeTruthy();
        if (f8Piece) {
            expect(f8Piece.type).toBe('t'); // Turtle already on f8
            expect(f8Piece.color).toBe('b');
        }

        // Get all legal moves from f7
        const legalMoves = game.moves({ verbose: true, square: 'f7' });
        console.log(
            'Legal moves from f7:',
            legalMoves.map((m) => ({
                from: m.from,
                to: m.to,
                coralPlaced: m.coralPlaced,
                coralRemoved: m.coralRemoved,
            })),
        );

        // Verify f7 to f8 is NOT a legal move (f8 is occupied)
        const f7ToF8Moves = legalMoves.filter((m) => m.to === 'f8');
        expect(f7ToF8Moves.length).toBe(0); // Should be no legal moves to f8

        // Create game snapshot for AI
        const gameSnapshot = createGameSnapshot(game);

        // Call AI with hard difficulty (10 seconds)
        const result = findBestMoveIterativeDeepening(
            gameSnapshot,
            20, // maxDepth
            'b', // black's turn
            10000, // 10 seconds for hard difficulty
        );

        console.log('AI returned move:', result.move);
        console.log('AI depth:', result.depth);
        console.log('AI nodes:', result.nodesEvaluated);

        // Verify the move is not null
        expect(result.move).not.toBeNull();

        // Verify the move is actually valid
        const allLegalMoves = game.moves({ verbose: true });
        const isValidMove = allLegalMoves.some((m: any) => {
            if (m.from !== result.move.from || m.to !== result.move.to) return false;
            if (m.promotion !== result.move.promotion) return false;
            if (m.whaleSecondSquare !== result.move.whaleSecondSquare) return false;

            // Check coral flags match exactly
            if ('coralPlaced' in result.move && m.coralPlaced !== result.move.coralPlaced)
                return false;
            if ('coralRemoved' in result.move && m.coralRemoved !== result.move.coralRemoved)
                return false;
            if (result.move.coralRemovedSquares) {
                const moveSquares = (m.coralRemovedSquares || []).sort().join(',');
                const resultSquares = result.move.coralRemovedSquares.sort().join(',');
                if (moveSquares !== resultSquares) return false;
            }

            return true;
        });

        expect(isValidMove).toBe(true);

        // Specifically check that f7 to f8 with coralPlaced is not returned
        if (result.move.from === 'f7' && result.move.to === 'f8') {
            expect(result.move.coralPlaced).not.toBe(true);
        }

        // Try to actually make the move to ensure it's valid
        const testGame = new CoralClash();
        applyFixture(testGame, aiTest1);

        expect(() => {
            testGame.move(result.move);
        }).not.toThrow();
    });
});
