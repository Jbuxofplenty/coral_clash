import aiTest2Fixture from '../__fixtures__/ai-test-2.json';
import { CoralClash, applyFixture, createGameSnapshot } from '../index';
import { getPieceValue } from '../v1.0.0/aiConfig';
import { findBestMoveIterativeDeepening, generatePositionKey } from '../v1.0.0/aiEvaluation';
import { EvaluationTable, getEvaluationTablePath } from '../v1.0.0/evaluationTable';
import { restoreGameFromSnapshot } from '../v1.0.0/gameState';

describe('Protect Valuable Piece: Dolphin at a4', () => {
    test('should protect dolphin when threatened by crab a2->a3', async () => {
        // Load the fixture game state
        const game = new CoralClash();
        applyFixture(game, aiTest2Fixture);

        // Verify initial state - it should be white's turn
        expect(game.turn()).toBe('w');

        // Verify black dolphin is at a4
        const dolphinAtA4 = game.get('a4');
        expect(dolphinAtA4).not.toBe(false);
        if (dolphinAtA4 !== false) {
            expect(dolphinAtA4.type).toBe('d');
            expect(dolphinAtA4.color).toBe('b');
            expect(dolphinAtA4.role).toBe('gatherer');
            console.log(
                `✅ Black dolphin gatherer is at a4 (value: ${getPieceValue('d', 'gatherer')})`,
            );
        }

        // Verify white crab is at a2
        const crabAtA2 = game.get('a2');
        expect(crabAtA2).not.toBe(false);
        if (crabAtA2 !== false) {
            expect(crabAtA2.type).toBe('c');
            expect(crabAtA2.color).toBe('w');
            console.log(`✅ White crab is at a2 (value: ${getPieceValue('c', 'hunter')})`);
        }

        // Find white's move: crab a2 -> a3 (threatens dolphin at a4)
        const whiteMoves = game.moves({ verbose: true });
        const threatMove = whiteMoves.find((m) => m.from === 'a2' && m.to === 'a3');

        if (!threatMove) {
            console.log('Available white moves from a2:');
            const a2Moves = whiteMoves.filter((m) => m.from === 'a2');
            a2Moves.forEach((m) => {
                console.log(`  ${m.from}->${m.to} (${m.piece})`);
            });
            throw new Error('Threat move a2->a3 not found');
        }

        // Make white's threat move
        const moveResult = game.move({
            from: threatMove.from,
            to: threatMove.to,
            promotion: threatMove.promotion,
            coralPlaced: threatMove.coralPlaced,
            coralRemoved: threatMove.coralRemoved,
            coralRemovedSquares: threatMove.coralRemovedSquares,
        });

        expect(moveResult).not.toBeNull();
        console.log(
            `\n✅ White moved crab ${threatMove.from}->${threatMove.to} (threatening dolphin)`,
        );

        // Verify dolphin is now threatened
        expect(game.isAttacked('a4', 'w')).toBe(true);
        console.log(`✅ Dolphin at a4 is now threatened by white`);

        // Now it's black's turn - should protect the dolphin
        expect(game.turn()).toBe('b');

        const gameState = createGameSnapshot(game);

        // Get all legal moves for computer (black)
        const allMoves = game.moves({ verbose: true });
        console.log(
            `\n=== All ${allMoves.length} possible moves for computer (black) after threat ===\n`,
        );

        // Find moves that protect the dolphin (either move it away or defend it)
        const dolphinMoves = allMoves.filter((m) => m.from === 'a4');
        const defensiveMoves = allMoves.filter((m) => {
            // Check if move defends a4
            const tempGame = new CoralClash();
            restoreGameFromSnapshot(tempGame, gameState);
            const moveResult = tempGame.move({
                from: m.from,
                to: m.to,
                promotion: m.promotion,
                coralPlaced: m.coralPlaced,
                coralRemoved: m.coralRemoved,
                coralRemovedSquares: m.coralRemovedSquares,
            });
            if (!moveResult) return false;
            const defends = tempGame.isAttacked('a4', 'b');
            return defends;
        });

        console.log(`\nMoves that move dolphin away: ${dolphinMoves.length}`);
        dolphinMoves.forEach((m) => {
            console.log(`  ${m.from}->${m.to}`);
        });

        console.log(`\nMoves that defend dolphin: ${defensiveMoves.length}`);
        defensiveMoves.forEach((m) => {
            console.log(`  ${m.from}->${m.to}`);
        });

        // Find the bad move (sacrificing dolphin to capture crab)
        const badMove = allMoves.find((m) => m.from === 'a4' && m.to === 'c2' && m.captured);
        if (badMove) {
            console.log(
                `\n⚠️  Found bad move: ${badMove.from}->${badMove.to} (sacrifices dolphin)`,
            );
        }

        // Find moves that protect the dolphin (for verification)
        const protectingMoves = allMoves.filter((m) => {
            if (m.from === 'a4') {
                // Moving dolphin away
                const tempGame = new CoralClash();
                restoreGameFromSnapshot(tempGame, gameState);
                const moveResult = tempGame.move({
                    from: m.from,
                    to: m.to,
                    promotion: m.promotion,
                    coralPlaced: m.coralPlaced,
                    coralRemoved: m.coralRemoved,
                    coralRemovedSquares: m.coralRemovedSquares,
                });
                if (moveResult) {
                    return !tempGame.isAttacked(m.to, 'w');
                }
            } else {
                // Defending dolphin
                const tempGame = new CoralClash();
                restoreGameFromSnapshot(tempGame, gameState);
                const moveResult = tempGame.move({
                    from: m.from,
                    to: m.to,
                    promotion: m.promotion,
                    coralPlaced: m.coralPlaced,
                    coralRemoved: m.coralRemoved,
                    coralRemovedSquares: m.coralRemovedSquares,
                });
                if (moveResult) {
                    const wasDefended = game.isAttacked('a4', 'b');
                    const isNowDefended = tempGame.isAttacked('a4', 'b');
                    const stillThreatened = tempGame.isAttacked('a4', 'w');
                    return (isNowDefended && !wasDefended) || !stillThreatened;
                }
            }
            return false;
        });

        console.log(`\n📊 Moves that protect dolphin: ${protectingMoves.length}`);
        protectingMoves.slice(0, 5).forEach((m) => {
            console.log(`   ${m.from}->${m.to}`);
        });

        // Load the most recent evaluation table
        let evaluationTable: EvaluationTable | null = null;
        try {
            const tablePath = await getEvaluationTablePath();
            evaluationTable = await EvaluationTable.load(tablePath);
            const tableSize = evaluationTable.size();
            const outdatedCount = evaluationTable.getOutdatedCount();
            console.log(`\n📚 Loaded evaluation table: ${tableSize} positions`);
            if (outdatedCount > 0) {
                console.log(`   ⚠️  ${outdatedCount} positions marked as outdated`);
            }

            // Check if this specific position is cached and if it's outdated
            const positionKey = generatePositionKey(gameState);
            const hasPosition = evaluationTable.has(positionKey);
            const isOutdated = evaluationTable.isOutdated(positionKey);
            console.log(`   Position key: ${positionKey}`);
            console.log(`   Position cached: ${hasPosition}`);
            console.log(`   Position outdated: ${isOutdated}`);

            // If position is cached but not outdated, mark it as outdated to force re-evaluation
            // This ensures we test with the latest scoring logic (defensive bonuses)
            if (hasPosition && !isOutdated) {
                console.log(
                    `   ⚠️  Marking position as outdated to force re-evaluation with new scoring`,
                );
                evaluationTable.markOutdated(positionKey);
            }
        } catch (error: any) {
            console.log(`\n⚠️  Could not load evaluation table: ${error.message}`);
            console.log(`   Will use fresh evaluation (no cached moves)`);
            evaluationTable = null;
        }

        // Test with findBestMoveIterativeDeepening (what the AI actually uses)
        // Use the loaded evaluation table (or null if not available)
        // Use higher depth to ensure defensive bonuses are properly evaluated
        const result = findBestMoveIterativeDeepening(
            gameState,
            8, // depth - increased to ensure defensive bonuses are evaluated properly
            'b', // computer color
            10000, // 10 seconds - more time for deeper search
            null, // no progress callback
            null, // no last move
            evaluationTable, // use most recent evaluation table
        );

        console.log(
            `\n🔍 findBestMoveIterativeDeepening selected: ${result.move?.from}->${result.move?.to}`,
        );
        console.log(`   Score: ${result.score.toFixed(2)}`);
        console.log(`   Depth: ${result.depth}`);
        console.log(`   Nodes evaluated: ${result.nodesEvaluated}`);

        // Check if the selected move is one that protects the dolphin
        const selectedMoveProtects = protectingMoves.some(
            (m) =>
                m.from === result.move?.from &&
                m.to === result.move?.to &&
                m.promotion === result.move?.promotion &&
                m.coralPlaced === result.move?.coralPlaced &&
                m.coralRemoved === result.move?.coralRemoved,
        );
        console.log(`   Protects dolphin: ${selectedMoveProtects}`);

        // Check if bad move was selected
        if (badMove && result.move) {
            const isBadMove =
                result.move.from === badMove.from &&
                result.move.to === badMove.to &&
                result.move.promotion === badMove.promotion &&
                result.move.coralPlaced === badMove.coralPlaced &&
                result.move.coralRemoved === badMove.coralRemoved;
            if (isBadMove) {
                console.log(`   ❌ BAD MOVE SELECTED: Sacrifices dolphin for capture!`);
            }
        }

        if (result.move) {
            // Verify the selected move protects the dolphin
            const tempGame = new CoralClash();
            restoreGameFromSnapshot(tempGame, gameState);
            const moveResult = tempGame.move({
                from: result.move.from,
                to: result.move.to,
                promotion: result.move.promotion,
                coralPlaced: result.move.coralPlaced,
                coralRemoved: result.move.coralRemoved,
                coralRemovedSquares: result.move.coralRemovedSquares,
            });

            let dolphinMoved = false;
            let dolphinDefended = false;

            if (moveResult) {
                // Check if dolphin is still threatened after the move
                const dolphinStillThreatened = tempGame.isAttacked('a4', 'w');
                dolphinMoved = result.move.from === 'a4';
                dolphinDefended = !dolphinStillThreatened && !dolphinMoved;

                if (dolphinMoved) {
                    console.log(`   ✅ Correctly moved dolphin away from threat!`);
                } else if (dolphinDefended) {
                    console.log(`   ✅ Correctly defended dolphin!`);
                } else if (result.move.from === 'a4' && result.move.to === 'c2') {
                    console.log(`   ❌ PROBLEM: Selected bad move that sacrifices dolphin!`);
                    console.log(`   Dolphin still threatened: ${dolphinStillThreatened}`);
                } else {
                    console.log(`   ⚠️  Move doesn't directly protect dolphin`);
                    console.log(`   Dolphin still threatened: ${dolphinStillThreatened}`);
                }
            }

            // Assert that the bad move (a4->c2) was NOT selected
            // The dolphin SHOULD move from a4, but NOT to c2 (which sacrifices it)
            const isBadMove = result.move.from === 'a4' && result.move.to === 'c2';
            expect(isBadMove).toBe(false);

            // Assert that the selected move actually protects the dolphin
            // Either moves it away from threat or defends it
            expect(dolphinMoved || dolphinDefended).toBe(true);
        }

        // Assertions
        expect(result.move).not.toBeNull();
        expect(allMoves.length).toBeGreaterThan(0);
    });
});
