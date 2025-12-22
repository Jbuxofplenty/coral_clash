import aiTestFixture from '../__fixtures__/ai-test.json';
import { CoralClash, applyFixture, createGameSnapshot } from '../index';
import { getPieceValue } from '../v1.0.0/aiConfig';
import { evaluatePosition, findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';

describe('Debug: Crab Not Capturing Dolphin at a5', () => {
    test('should show scores for all moves after white moves dolphin d2->a5', () => {
        // Load the fixture game state
        const game = new CoralClash();
        applyFixture(game, aiTestFixture);

        // Verify initial state - it should be white's turn
        expect(game.turn()).toBe('w');

        // Find white's dolphin at d2 and move it to a5
        const whiteMoves = game.moves({ verbose: true });
        const dolphinMove = whiteMoves.find((m) => {
            const piece = game.get(m.from);
            return (
                piece !== false &&
                piece.type === 'd' &&
                piece.color === 'w' &&
                m.from === 'd2' &&
                m.to === 'a5'
            );
        });

        if (!dolphinMove) {
            console.log('Available white moves from d2:');
            const d2Moves = whiteMoves.filter((m) => m.from === 'd2');
            d2Moves.forEach((m) => {
                console.log(`  ${m.from}->${m.to} (${m.piece})`);
            });
            throw new Error('Dolphin move d2->a5 not found');
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

        // Now it's black's turn - should capture with crab at a6
        expect(game.turn()).toBe('b');

        // Verify the dolphin is at a5
        const pieceAtA5 = game.get('a5');
        expect(pieceAtA5).not.toBe(false);
        if (pieceAtA5 !== false) {
            expect(pieceAtA5.type).toBe('d');
            expect(pieceAtA5.color).toBe('w');
            console.log(`✅ Dolphin is at a5 (${pieceAtA5.type} ${pieceAtA5.role || ''})`);
        }

        // Verify black crab is at a6
        const pieceAtA6 = game.get('a6');
        expect(pieceAtA6).not.toBe(false);
        if (pieceAtA6 !== false) {
            expect(pieceAtA6.type).toBe('c');
            expect(pieceAtA6.color).toBe('b');
            console.log(`✅ Black crab is at a6 (${pieceAtA6.type} ${pieceAtA6.role || ''})`);
        }

        // Get all legal moves for computer (black)
        const allMoves = game.moves({ verbose: true });
        console.log(
            `\n=== All ${allMoves.length} possible moves for computer (black) after d2->a5 ===\n`,
        );

        // Filter moves to a5 (should be the capture)
        const a5Moves = allMoves.filter((m) => m.to === 'a5');
        console.log(`Found ${a5Moves.length} move(s) to a5:`);
        for (const m of a5Moves) {
            console.log(`  ${m.from}->${m.to} (${m.piece}) captured: ${m.captured || 'none'}`);
        }

        // Check if a6->a5 capture exists
        const captureMove = a5Moves.find((m) => m.from === 'a6' && m.to === 'a5' && m.captured);
        if (!captureMove) {
            console.log('\n⚠️  PROBLEM: Capture move a6->a5 not found!');
            console.log('Available moves from a6:');
            const a6Moves = allMoves.filter((m) => m.from === 'a6');
            a6Moves.forEach((m) => {
                console.log(`  ${m.from}->${m.to} (${m.piece}) captured: ${m.captured || 'none'}`);
            });
        } else {
            console.log(`\n✅ Found capture move: ${captureMove.from}->${captureMove.to}`);
            console.log(
                `   Capturing: ${captureMove.captured} ${(captureMove as any).capturedRole || ''}`,
            );
        }

        const gameState = createGameSnapshot(game);
        const moveScores: Array<{
            move: string;
            from: string;
            to: string;
            piece: string;
            captured: string | null;
            score: number;
            isHanging: boolean;
            isAttacked: boolean;
            isDefended: boolean;
            pieceValue: number;
            capturedValue: number;
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
                let capturedValue = 0;

                if (movedPiece !== false && movedPiece.type !== 'h') {
                    isAttacked = game.isAttacked(move.to, 'w');
                    isDefended = game.isAttacked(move.to, 'b');
                    isHanging = isAttacked && !isDefended;
                    pieceValue = getPieceValue(movedPiece.type, movedPiece.role || null);
                }

                // Get captured piece value
                if (move.captured) {
                    capturedValue = getPieceValue(
                        move.captured,
                        (move as any).capturedRole || null,
                    );
                }

                // Evaluate position
                const score = evaluatePosition(game, 'b');

                moveScores.push({
                    move: `${move.from}->${move.to}`,
                    from: move.from,
                    to: move.to,
                    piece: move.piece || '?',
                    captured: move.captured || null,
                    score,
                    isHanging,
                    isAttacked,
                    isDefended,
                    pieceValue,
                    capturedValue,
                });

                game.undo();
            } catch (_error) {
                // Skip invalid moves
                continue;
            }
        }

        // Sort by score (from black's perspective - higher is better)
        moveScores.sort((a, b) => b.score - a.score);

        // Log all moves (show top 30 and any a5 moves)
        console.log("\nMove Scores (sorted by score from black's perspective, highest first):");
        console.log('='.repeat(140));
        console.log(
            'Move'.padEnd(12) +
                'Piece'.padEnd(8) +
                'Captured'.padEnd(12) +
                'Score'.padEnd(12) +
                'Value'.padEnd(10) +
                'CaptVal'.padEnd(10) +
                'Hanging'.padEnd(10) +
                'Attacked'.padEnd(10) +
                'Defended'.padEnd(10),
        );
        console.log('-'.repeat(140));

        // Show top moves and any a5 moves
        const topMoves = moveScores.slice(0, 30);
        const a5MoveScores = moveScores.filter((ms) => ms.to === 'a5');

        for (const ms of topMoves) {
            const hangingStr = ms.isHanging ? '⚠️ YES' : '✓ No';
            const attackedStr = ms.isAttacked ? '⚠️ YES' : '✓ No';
            const defendedStr = ms.isDefended ? '✓ YES' : '✗ No';
            const capturedStr = ms.captured ? `${ms.captured} ${ms.capturedValue}` : 'none';

            console.log(
                ms.move.padEnd(12) +
                    ms.piece.padEnd(8) +
                    capturedStr.padEnd(12) +
                    ms.score.toFixed(2).padEnd(12) +
                    ms.pieceValue.toString().padEnd(10) +
                    ms.capturedValue.toString().padEnd(10) +
                    hangingStr.padEnd(10) +
                    attackedStr.padEnd(10) +
                    defendedStr.padEnd(10),
            );
        }

        // Show a5 moves if they exist (even if not in top 30)
        if (a5MoveScores.length > 0) {
            console.log('\n--- Moves to a5 (may be lower ranked) ---');
            for (const ms of a5MoveScores) {
                const hangingStr = ms.isHanging ? '⚠️ YES' : '✓ No';
                const attackedStr = ms.isAttacked ? '⚠️ YES' : '✓ No';
                const defendedStr = ms.isDefended ? '✓ YES' : '✗ No';
                const capturedStr = ms.captured ? `${ms.captured} ${ms.capturedValue}` : 'none';

                console.log(
                    ms.move.padEnd(12) +
                        ms.piece.padEnd(8) +
                        capturedStr.padEnd(12) +
                        ms.score.toFixed(2).padEnd(12) +
                        ms.pieceValue.toString().padEnd(10) +
                        ms.capturedValue.toString().padEnd(10) +
                        hangingStr.padEnd(10) +
                        attackedStr.padEnd(10) +
                        defendedStr.padEnd(10),
                );
            }
        }

        // Check a5 capture move specifically
        if (a5MoveScores.length > 0) {
            const captureMoveScore = a5MoveScores.find((ms) => ms.captured);
            if (captureMoveScore) {
                console.log(`\n⚠️  Capture move to a5:`);
                console.log(
                    `   ${captureMoveScore.move}: Score ${captureMoveScore.score.toFixed(2)}`,
                );
                console.log(
                    `   Capturing: ${captureMoveScore.captured} (value: ${captureMoveScore.capturedValue})`,
                );
                console.log(`   Is Hanging: ${captureMoveScore.isHanging}`);
                console.log(`   Is Attacked: ${captureMoveScore.isAttacked}`);
                console.log(`   Is Defended: ${captureMoveScore.isDefended}`);

                // Compare with best move
                const bestMove = moveScores[0];
                console.log(
                    `\n📊 Comparing capture move (${captureMoveScore.score.toFixed(2)}) vs best move (${bestMove.score.toFixed(2)})`,
                );
                console.log(
                    `   Difference: ${(bestMove.score - captureMoveScore.score).toFixed(2)}`,
                );

                if (captureMoveScore.score < bestMove.score) {
                    console.log(`   ⚠️  PROBLEM: Capture move scores LOWER than best move!`);
                    console.log(`   Expected: Capture should score higher due to material gain`);
                }
            }
        } else {
            console.log(`\nℹ️  No moves to a5 found`);
        }

        // Best move
        const bestMove = moveScores[0];
        console.log(`\n✅ Best move: ${bestMove.move} (score: ${bestMove.score.toFixed(2)})`);
        console.log(`   Captured: ${bestMove.captured || 'none'}`);
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
            // Check if the selected move is the capture
            if (result.move.from === 'a6' && result.move.to === 'a5') {
                console.log(`   ✅ Correctly selected capture move!`);
            } else {
                console.log(`   ⚠️  PROBLEM: Did NOT select capture move a6->a5!`);
                console.log(`   Selected: ${result.move.from}->${result.move.to}`);

                // Check if selected move leaves a piece hanging
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

                if (piece !== false && piece.type !== 'h') {
                    console.log(`   Piece at ${result.move.to}: ${piece.type} ${piece.role || ''}`);
                    console.log(`   Is Attacked: ${isAttacked}`);
                    console.log(`   Is Defended: ${isDefended}`);
                    console.log(`   Is Hanging: ${isHanging}`);
                }

                game.undo();
            }
        }

        // Assertions
        expect(moveScores.length).toBeGreaterThan(0);

        // The capture move should exist and score well
        if (a5MoveScores.length > 0) {
            const captureMoveScore = a5MoveScores.find((ms) => ms.captured);
            if (captureMoveScore) {
                // Capture move should score higher than non-capture moves (material gain)
                const nonCaptureMoves = moveScores.filter((ms) => !ms.captured && ms.to !== 'a5');
                if (nonCaptureMoves.length > 0) {
                    console.log(
                        `\n📊 Comparing capture move (${captureMoveScore.score.toFixed(2)}) vs best non-capture move (${nonCaptureMoves[0].score.toFixed(2)})`,
                    );
                    // Note: We're not asserting this because we want to debug why it's not scoring higher
                }
            }
        }
    });
});
