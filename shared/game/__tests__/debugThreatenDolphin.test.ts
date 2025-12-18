import aiTest1Fixture from '../__fixtures__/ai-test-1.json';
import { CoralClash, applyFixture, createGameSnapshot } from '../index';
import { getPieceValue } from '../v1.0.0/aiConfig';
import { evaluatePosition, findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';

describe('Debug: Crab Not Threatening Dolphin at h5', () => {
    test('should show scores for all moves after white moves dolphin e2->h5', () => {
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

        // Now it's black's turn - should threaten with crab at h7->h6
        expect(game.turn()).toBe('b');

        // Verify the dolphin is at h5
        const pieceAtH5 = game.get('h5');
        expect(pieceAtH5).not.toBe(false);
        if (pieceAtH5 !== false) {
            expect(pieceAtH5.type).toBe('d');
            expect(pieceAtH5.color).toBe('w');
            console.log(`✅ Dolphin is at h5 (${pieceAtH5.type} ${pieceAtH5.role || ''})`);
        }

        // Verify black crab is at h7
        const pieceAtH7 = game.get('h7');
        expect(pieceAtH7).not.toBe(false);
        if (pieceAtH7 !== false) {
            expect(pieceAtH7.type).toBe('c');
            expect(pieceAtH7.color).toBe('b');
            console.log(`✅ Black crab is at h7 (${pieceAtH7.type} ${pieceAtH7.role || ''})`);
        }

        // Get all legal moves for computer (black)
        const allMoves = game.moves({ verbose: true });
        console.log(
            `\n=== All ${allMoves.length} possible moves for computer (black) after e2->h5 ===\n`,
        );

        // Filter moves to h6 (should be the threatening move)
        const h6Moves = allMoves.filter((m) => m.to === 'h6');
        console.log(`Found ${h6Moves.length} move(s) to h6:`);
        for (const m of h6Moves) {
            console.log(`  ${m.from}->${m.to} (${m.piece})`);
        }

        // Check if h7->h6 threat exists
        const threatMove = h6Moves.find((m) => m.from === 'h7' && m.to === 'h6');
        if (!threatMove) {
            console.log('\n⚠️  PROBLEM: Threat move h7->h6 not found!');
            console.log('Available moves from h7:');
            const h7Moves = allMoves.filter((m) => m.from === 'h7');
            h7Moves.forEach((m) => {
                console.log(`  ${m.from}->${m.to} (${m.piece})`);
            });
        } else {
            console.log(`\n✅ Found threat move: ${threatMove.from}->${threatMove.to}`);
        }

        // Check what move was actually selected (a8->b7)
        const badMove = allMoves.find((m) => m.from === 'a8' && m.to === 'b7');
        if (badMove) {
            console.log(
                `\n⚠️  Found the bad move that was selected: ${badMove.from}->${badMove.to}`,
            );
            const piece = game.get(badMove.from);
            if (piece !== false) {
                console.log(`   Piece: ${piece.type} ${piece.role || ''}`);
            }
        }

        const gameState = createGameSnapshot(game);
        const moveScores: Array<{
            move: string;
            from: string;
            to: string;
            piece: string;
            threatensDolphin: boolean;
            score: number;
            isHanging: boolean;
            isAttacked: boolean;
            isDefended: boolean;
            pieceValue: number;
        }> = [];

        for (const move of allMoves) {
            if (!move.from || !move.to) continue;

            try {
                const moveResult = game.move({
                    from: move.from,
                    to: move.to,
                    promotion: move.promotion,
                    coralPlaced: move.coralPlaced,
                    coralRemoved: move.coralRemoved,
                    coralRemovedSquares: move.coralRemovedSquares,
                });

                if (!moveResult) {
                    continue;
                }

                // Check if this move threatens the dolphin at h5
                const threatensDolphin = game.isAttacked('h5', 'b');

                // Check if moved piece is hanging
                const movedPiece = game.get(move.to);
                let isHanging = false;
                let isAttacked = false;
                let isDefended = false;
                let pieceValue = 0;

                if (movedPiece !== false && movedPiece.type !== 'h') {
                    isAttacked = game.isAttacked(move.to, 'w');
                    isDefended = game.isAttacked(move.to, 'b');
                    isHanging = isAttacked && !isDefended;
                    pieceValue = getPieceValue(movedPiece.type, movedPiece.role || null);
                }

                // Evaluate position
                const newGameState = createGameSnapshot(game);
                const score = evaluatePosition(newGameState, 'b');

                moveScores.push({
                    move: `${move.from}->${move.to}`,
                    from: move.from,
                    to: move.to,
                    piece: move.piece || '?',
                    threatensDolphin,
                    score,
                    isHanging,
                    isAttacked,
                    isDefended,
                    pieceValue,
                });

                game.undo();
            } catch (_error) {
                // Skip invalid moves
                continue;
            }
        }

        // Sort by score (from black's perspective - higher is better)
        moveScores.sort((a, b) => b.score - a.score);

        // Log all moves (show top 30 and any h6 moves)
        console.log("\nMove Scores (sorted by score from black's perspective, highest first):");
        console.log('='.repeat(140));
        console.log(
            'Move'.padEnd(12) +
                'Piece'.padEnd(8) +
                'Threatens'.padEnd(12) +
                'Score'.padEnd(12) +
                'Value'.padEnd(10) +
                'Hanging'.padEnd(10) +
                'Attacked'.padEnd(10) +
                'Defended'.padEnd(10),
        );
        console.log('-'.repeat(140));

        // Show top moves and any h6 moves
        const topMoves = moveScores.slice(0, 30);
        const h6MoveScores = moveScores.filter((ms) => ms.to === 'h6');
        const badMoveScores = moveScores.filter((ms) => ms.from === 'a8' && ms.to === 'b7');

        for (const ms of topMoves) {
            const hangingStr = ms.isHanging ? '⚠️ YES' : '✓ No';
            const attackedStr = ms.isAttacked ? '⚠️ YES' : '✓ No';
            const defendedStr = ms.isDefended ? '✓ YES' : '✗ No';
            const threatensStr = ms.threatensDolphin ? '✅ YES' : '✗ No';

            console.log(
                ms.move.padEnd(12) +
                    ms.piece.padEnd(8) +
                    threatensStr.padEnd(12) +
                    ms.score.toFixed(2).padEnd(12) +
                    ms.pieceValue.toString().padEnd(10) +
                    hangingStr.padEnd(10) +
                    attackedStr.padEnd(10) +
                    defendedStr.padEnd(10),
            );
        }

        // Show h6 moves if they exist (even if not in top 30)
        if (h6MoveScores.length > 0) {
            console.log('\n--- Moves to h6 (threatening dolphin) ---');
            for (const ms of h6MoveScores) {
                const hangingStr = ms.isHanging ? '⚠️ YES' : '✓ No';
                const attackedStr = ms.isAttacked ? '⚠️ YES' : '✓ No';
                const defendedStr = ms.isDefended ? '✓ YES' : '✗ No';
                const threatensStr = ms.threatensDolphin ? '✅ YES' : '✗ No';

                console.log(
                    ms.move.padEnd(12) +
                        ms.piece.padEnd(8) +
                        threatensStr.padEnd(12) +
                        ms.score.toFixed(2).padEnd(12) +
                        ms.pieceValue.toString().padEnd(10) +
                        hangingStr.padEnd(10) +
                        attackedStr.padEnd(10) +
                        defendedStr.padEnd(10),
                );
            }
        }

        // Show bad move (a8->b7) if it exists
        if (badMoveScores.length > 0) {
            console.log('\n--- Bad move that was selected (a8->b7) ---');
            for (const ms of badMoveScores) {
                const hangingStr = ms.isHanging ? '⚠️ YES' : '✓ No';
                const attackedStr = ms.isAttacked ? '⚠️ YES' : '✓ No';
                const defendedStr = ms.isDefended ? '✓ YES' : '✗ No';
                const threatensStr = ms.threatensDolphin ? '✅ YES' : '✗ No';

                console.log(
                    ms.move.padEnd(12) +
                        ms.piece.padEnd(8) +
                        threatensStr.padEnd(12) +
                        ms.score.toFixed(2).padEnd(12) +
                        ms.pieceValue.toString().padEnd(10) +
                        hangingStr.padEnd(10) +
                        attackedStr.padEnd(10) +
                        defendedStr.padEnd(10),
                );
            }
        }

        // Check h6 threat move specifically
        if (h6MoveScores.length > 0) {
            const threatMoveScore = h6MoveScores.find((ms) => ms.from === 'h7');
            if (threatMoveScore) {
                console.log(`\n⚠️  Threat move to h6:`);
                console.log(
                    `   ${threatMoveScore.move}: Score ${threatMoveScore.score.toFixed(2)}`,
                );
                console.log(`   Threatens Dolphin: ${threatMoveScore.threatensDolphin}`);
                console.log(`   Is Hanging: ${threatMoveScore.isHanging}`);
                console.log(`   Is Attacked: ${threatMoveScore.isAttacked}`);
                console.log(`   Is Defended: ${threatMoveScore.isDefended}`);

                // Compare with best move
                const bestMove = moveScores[0];
                console.log(
                    `\n📊 Comparing threat move (${threatMoveScore.score.toFixed(2)}) vs best move (${bestMove.score.toFixed(2)})`,
                );
                console.log(
                    `   Difference: ${(bestMove.score - threatMoveScore.score).toFixed(2)}`,
                );

                if (threatMoveScore.score < bestMove.score) {
                    console.log(`   ⚠️  PROBLEM: Threat move scores LOWER than best move!`);
                    console.log(`   Expected: Threatening valuable pieces should score higher`);
                }
            }
        } else {
            console.log(`\nℹ️  No moves to h6 found`);
        }

        // Best move
        const bestMove = moveScores[0];
        console.log(`\n✅ Best move: ${bestMove.move} (score: ${bestMove.score.toFixed(2)})`);
        console.log(`   Threatens Dolphin: ${bestMove.threatensDolphin}`);
        console.log(`   Is Hanging: ${bestMove.isHanging}`);

        // Test with findBestMoveIterativeDeepening (what the AI actually uses)
        const result = findBestMoveIterativeDeepening(
            gameState,
            3, // depth
            'b', // computer color
            5000, // 5 seconds
            null, // no progress callback
            null, // no last move
        );

        console.log(
            `\n🔍 findBestMoveIterativeDeepening selected: ${result.move?.from}->${result.move?.to}`,
        );
        console.log(`   Score: ${result.score.toFixed(2)}`);
        console.log(`   Depth: ${result.depth}`);
        console.log(`   Nodes evaluated: ${result.nodesEvaluated}`);

        if (result.move) {
            // Check if the selected move threatens the dolphin
            game.move({
                from: result.move.from,
                to: result.move.to,
                promotion: result.move.promotion,
                coralPlaced: result.move.coralPlaced,
                coralRemoved: result.move.coralRemoved,
                coralRemovedSquares: result.move.coralRemovedSquares,
            });

            const threatensDolphin = game.isAttacked('h5', 'b');

            if (result.move.from === 'h7' && result.move.to === 'h6') {
                console.log(`   ✅ Correctly selected threat move!`);
            } else {
                console.log(`   ⚠️  PROBLEM: Did NOT select threat move h7->h6!`);
                console.log(`   Selected: ${result.move.from}->${result.move.to}`);
                console.log(`   Threatens Dolphin: ${threatensDolphin}`);

                if (result.move.from === 'a8' && result.move.to === 'b7') {
                    console.log(`   ⚠️  Selected the bad move (a8->b7)!`);
                }
            }

            game.undo();
        }

        // Assertions
        expect(moveScores.length).toBeGreaterThan(0);
    });
});
