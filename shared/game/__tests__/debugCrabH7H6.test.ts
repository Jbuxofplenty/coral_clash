import aiTest1Fixture from '../__fixtures__/ai-test-1.json';
import { CoralClash, applyFixture, createGameSnapshot } from '../index';
import { findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';

describe('Debug: Crab should move h7->h6 instead of bad trade', () => {
    test('should select h7->h6 over trading octopus for turtle', () => {
        // Load the fixture game state
        const game = new CoralClash();
        applyFixture(game, aiTest1Fixture);

        // Verify initial state - it should be white's turn
        expect(game.turn()).toBe('w');

        // Find white's dolphin at e2 and move it to h5
        const whiteMoves = game.moves({ verbose: true });
        const dolphinMove = whiteMoves.find((m) => {
            const piece = game.get(m.from);
            return (
                piece !== false &&
                piece.type === 'd' &&
                piece.color === 'w' &&
                m.from === 'e2' &&
                m.to === 'h5'
            );
        });

        if (!dolphinMove) {
            console.log('Available white moves from e2:');
            const e2Moves = whiteMoves.filter((m) => m.from === 'e2');
            e2Moves.forEach((m) => {
                console.log(`  ${m.from}->${m.to} (${m.piece})`);
            });
            throw new Error('Dolphin move e2->h5 not found');
        }

        // Make white's move
        const moveResult = game.move({
            from: dolphinMove.from,
            to: dolphinMove.to,
            promotion: dolphinMove.promotion,
            coralPlaced: dolphinMove.coralPlaced,
            coralRemoved: dolphinMove.coralRemoved,
            coralRemovedSquares: dolphinMove.coralRemovedSquares,
        });

        expect(moveResult).not.toBeNull();
        console.log(`\n✅ White moved dolphin ${dolphinMove.from}->${dolphinMove.to}`);

        // Now it's black's turn - should select h7->h6 (threatening dolphin) instead of bad trade
        const gameState = createGameSnapshot(game);
        expect(game.turn()).toBe('b');

        // Find all black moves to see what's available
        const blackMoves = game.moves({ verbose: true });
        console.log(`\n📋 Available black moves (${blackMoves.length} total):`);

        // Check for the expected moves
        const h7h6Move = blackMoves.find((m) => m.from === 'h7' && m.to === 'h6');
        const badTradeMove = blackMoves.find((m) => m.from === 'b8' && m.to === 'b2' && m.captured === 'o');

        if (h7h6Move) {
            console.log(`  ✅ Found threat move: h7->h6`);
        } else {
            console.log(`  ❌ Threat move h7->h6 not found`);
        }

        if (badTradeMove) {
            console.log(`  ⚠️  Found bad trade move: b8->b2 (turtle capturing octopus)`);
        } else {
            console.log(`  ✅ Bad trade move b8->b2 not found`);
        }

        // Run AI to find best move
        console.log(`\n🤖 Running AI to find best move...`);
        const result = findBestMoveIterativeDeepening(gameState, 3, 'b', 5000);

        expect(result.move).not.toBeNull();
        const selectedMove = result.move!;
        console.log(`\n🔍 AI selected: ${selectedMove.from}->${selectedMove.to}`);
        console.log(`   Score: ${result.score}`);
        console.log(`   Depth: ${result.depth}`);
        console.log(`   Nodes evaluated: ${result.nodesEvaluated}`);

        // Assert that h7->h6 is selected
        expect(selectedMove.from).toBe('h7');
        expect(selectedMove.to).toBe('h6');
        console.log(`\n✅ Correctly selected threat move h7->h6!`);

        // Assert that bad trade move is NOT selected
        expect(selectedMove.from).not.toBe('b8');
        expect(selectedMove.to).not.toBe('b2');
        console.log(`\n✅ Correctly avoided bad trade move b8->b2!`);
    });
});

