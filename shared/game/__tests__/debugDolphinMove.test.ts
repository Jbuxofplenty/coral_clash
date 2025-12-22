import { CoralClash, createGameSnapshot } from '../index';
import { getPieceValue } from '../v1.0.0/aiConfig';
import { evaluatePosition, findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';

describe('Debug: Dolphin Moving Unprotected to g5', () => {
    test('should show scores for all moves on first move after fresh board', () => {
        // Start with a fresh game (starting position)
        const game = new CoralClash();

        // Make white's first move (simulating user moving octopus e3->f4)
        // First, find an octopus move from the starting position
        const whiteMoves = game.moves({ verbose: true });
        const octopusMove = whiteMoves.find((m) => {
            const piece = game.get(m.from);
            return piece !== false && piece.type === 'o' && m.from === 'e3' && m.to === 'f4';
        });

        // If exact move not found, find any octopus move
        let foundMove = octopusMove;
        if (!foundMove) {
            foundMove = whiteMoves.find((m) => {
                const piece = game.get(m.from);
                return piece !== false && piece.type === 'o';
            });
        }

        if (foundMove) {
            game.move({
                from: foundMove.from,
                to: foundMove.to,
                promotion: foundMove.promotion,
                coralPlaced: foundMove.coralPlaced,
                coralRemoved: foundMove.coralRemoved,
                coralRemovedSquares: foundMove.coralRemovedSquares,
            });
        }

        // Now it's black's turn (computer's first move)
        expect(game.turn()).toBe('b');

        // Get all legal moves for computer (black)
        const allMoves = game.moves({ verbose: true });
        console.log(
            `\n=== All ${allMoves.length} possible moves for computer (black) - First move ===\n`,
        );

        // Filter moves to g5
        const g5Moves = allMoves.filter((m) => m.to === 'g5');
        console.log(`Found ${g5Moves.length} move(s) to g5:`);
        for (const m of g5Moves) {
            console.log(`  ${m.from}->${m.to} (${m.piece})`);
        }

        const gameState = createGameSnapshot(game);
        const moveScores: Array<{
            move: string;
            from: string;
            to: string;
            piece: string;
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
                const score = evaluatePosition(game, 'b');

                moveScores.push({
                    move: `${move.from}->${move.to}`,
                    from: move.from,
                    to: move.to,
                    piece: move.piece || '?',
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

        // Sort by score
        moveScores.sort((a, b) => b.score - a.score);

        // Log all moves (show top 30 and any g5 moves)
        console.log('\nMove Scores (sorted by score, highest first):');
        console.log('='.repeat(120));
        console.log(
            'Move'.padEnd(12) +
                'Piece'.padEnd(8) +
                'Score'.padEnd(12) +
                'Value'.padEnd(10) +
                'Hanging'.padEnd(10) +
                'Attacked'.padEnd(10) +
                'Defended'.padEnd(10),
        );
        console.log('-'.repeat(120));

        // Show top moves and any g5 moves
        const topMoves = moveScores.slice(0, 30);
        const g5MoveScores = moveScores.filter((ms) => ms.to === 'g5');

        for (const ms of topMoves) {
            const hangingStr = ms.isHanging ? '⚠️ YES' : '✓ No';
            const attackedStr = ms.isAttacked ? '⚠️ YES' : '✓ No';
            const defendedStr = ms.isDefended ? '✓ YES' : '✗ No';

            console.log(
                ms.move.padEnd(12) +
                    ms.piece.padEnd(8) +
                    ms.score.toFixed(2).padEnd(12) +
                    ms.pieceValue.toString().padEnd(10) +
                    hangingStr.padEnd(10) +
                    attackedStr.padEnd(10) +
                    defendedStr.padEnd(10),
            );
        }

        // Show g5 moves if they exist (even if not in top 30)
        if (g5MoveScores.length > 0) {
            console.log('\n--- Moves to g5 (may be lower ranked) ---');
            for (const ms of g5MoveScores) {
                const hangingStr = ms.isHanging ? '⚠️ YES' : '✓ No';
                const attackedStr = ms.isAttacked ? '⚠️ YES' : '✓ No';
                const defendedStr = ms.isDefended ? '✓ YES' : '✗ No';

                console.log(
                    ms.move.padEnd(12) +
                        ms.piece.padEnd(8) +
                        ms.score.toFixed(2).padEnd(12) +
                        ms.pieceValue.toString().padEnd(10) +
                        hangingStr.padEnd(10) +
                        attackedStr.padEnd(10) +
                        defendedStr.padEnd(10),
                );
            }
        }

        // Check g5 moves specifically
        if (g5MoveScores.length > 0) {
            console.log(`\n⚠️  Move(s) to g5:`);
            for (const g5 of g5MoveScores) {
                console.log(
                    `   ${g5.move}: Score ${g5.score.toFixed(2)}, Hanging: ${g5.isHanging}`,
                );
                if (g5.isHanging) {
                    const expectedPenalty = g5.pieceValue * 1.2;
                    console.log(`   Expected penalty: ${expectedPenalty.toFixed(2)}`);
                    console.log(
                        `   Score should be ~${(g5.pieceValue - expectedPenalty).toFixed(2)}`,
                    );
                    console.log(`   Actual score: ${g5.score.toFixed(2)}`);

                    // Check if penalty is being applied
                    if (g5.score > -expectedPenalty) {
                        console.log(
                            `   ⚠️  PROBLEM: Score too high! Penalty may not be applied correctly.`,
                        );
                    }
                }
            }
        } else {
            console.log(`\nℹ️  No moves to g5 found`);
        }

        // Best move
        const bestMove = moveScores[0];
        console.log(`\n✅ Best move: ${bestMove.move} (score: ${bestMove.score.toFixed(2)})`);
        console.log(`   Is Hanging: ${bestMove.isHanging}`);

        // Test with findBestMoveIterativeDeepening (what the AI actually uses)
        const result = findBestMoveIterativeDeepening(
            gameState,
            3, // depth
            'b', // computer color
            5000, // 5 seconds
            null, // no progress callback
            null, // no last move (first move)
        );

        console.log(
            `\n🔍 findBestMoveIterativeDeepening selected: ${result.move?.from}->${result.move?.to}`,
        );
        console.log(`   Score: ${result.score.toFixed(2)}`);
        console.log(`   Depth: ${result.depth}`);
        console.log(`   Nodes evaluated: ${result.nodesEvaluated}`);

        if (result.move) {
            // Check if the selected move leaves a piece hanging
            game.move({
                from: result.move.from,
                to: result.move.to,
                promotion: result.move.promotion,
                coralPlaced: result.move.coralPlaced,
                coralRemoved: result.move.coralRemoved,
                coralRemovedSquares: result.move.coralRemovedSquares,
            });

            const piece = game.get(result.move.to);
            const isAttacked = game.isAttacked(result.move.to, 'w');
            const isDefended = game.isAttacked(result.move.to, 'b');
            const isHanging = isAttacked && !isDefended;

            if (result.move.to === 'g5') {
                console.log(`   ⚠️  PROBLEM: Selected g5 move!`);
            }

            if (piece !== false && piece.type !== 'h') {
                console.log(`   Piece at ${result.move.to}: ${piece.type} ${piece.role || ''}`);
                console.log(`   Is Attacked: ${isAttacked}`);
                console.log(`   Is Defended: ${isDefended}`);
                console.log(`   Is Hanging: ${isHanging}`);

                if (isHanging) {
                    console.log(`   ⚠️  PROBLEM: Selected move leaves piece hanging!`);
                    const pieceValue = getPieceValue(piece.type, piece.role || null);
                    console.log(`   Piece value: ${pieceValue}`);
                    console.log(`   Expected penalty: ${pieceValue * 1.2}`);
                    console.log(`   This should have been heavily penalized!`);
                }
            }

            game.undo();
        }

        // Assertions
        expect(moveScores.length).toBeGreaterThan(0);

        // If g5 move exists and is hanging, it should score worse than safe moves
        if (g5MoveScores.length > 0) {
            const g5Move = g5MoveScores[0];
            if (g5Move.isHanging) {
                const safeMoves = moveScores.filter((ms) => !ms.isHanging && ms.to !== 'g5');
                if (safeMoves.length > 0) {
                    console.log(
                        `\n📊 Comparing g5 move (${g5Move.score.toFixed(2)}) vs best safe move (${safeMoves[0].score.toFixed(2)})`,
                    );
                    expect(safeMoves[0].score).toBeGreaterThan(g5Move.score);
                }
            }
        }

        // The best move should NOT be hanging
        if (bestMove.isHanging) {
            console.log(`\n❌ PROBLEM: Best move leaves piece hanging!`);
        }
        expect(bestMove.isHanging).toBe(false);
    });
});
