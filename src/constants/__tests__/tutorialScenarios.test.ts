/**
 * Tests for tutorial scenario moves
 * Ensures the autoplay sequences in tutorial scenarios are valid
 */

import { CoralClash, applyFixture } from '@jbuxofplenty/coral-clash';
// @ts-ignore - JS file without types
import { TUTORIAL_SCENARIOS } from '../tutorialScenarios';

describe('Tutorial Scenarios', () => {
    describe('Hunter Effect', () => {
        it('should allow hunter crab to move onto coral and remove it', () => {
            const game = new CoralClash();
            const scenario = TUTORIAL_SCENARIOS.hunterEffect;

            applyFixture(game, scenario.fixture, { skipValidation: true });

            // Verify initial state
            expect(game.get('c4')).toEqual({ type: 'c', color: 'w', role: 'hunter' });
            expect(game.getCoral('d4')).toBe('b');
            expect(game.getCoralRemaining('w')).toBe(17);
            expect(game.getCoralRemaining('b')).toBe(16);

            // Get available moves for the crab
            const moves = game.moves({ verbose: true, square: 'c4' });
            console.log('Available moves from c4:', moves);

            // Should have a move to d4
            const moveToD4 = moves.filter((m) => m.from === 'c4' && m.to === 'd4');
            expect(moveToD4.length).toBeGreaterThan(0);

            // Should have options for coral removal (true) and no removal (false)
            const moveWithRemoval = moveToD4.find((m) => m.coralRemoved === true);
            const moveWithoutRemoval = moveToD4.find((m) => m.coralRemoved === false);

            expect(moveWithRemoval).toBeDefined();
            expect(moveWithoutRemoval).toBeDefined();

            // Make the move with coral removal (from autoplay sequence)
            const move = scenario.autoPlaySequence.moves[0];
            const result = game.move(move);

            expect(result).toBeDefined();
            expect(result.coralRemoved).toBe(true);
            expect(game.get('d4')).toEqual({ type: 'c', color: 'w', role: 'hunter' });
            expect(game.getCoral('d4')).toBeNull();
            expect(game.getCoralRemaining('w')).toBe(17);
            expect(game.getCoralRemaining('b')).toBe(17); // Black coral returned
        });
    });

    describe('Gatherer Effect', () => {
        it('should allow gatherer octopus to move and place coral', () => {
            const game = new CoralClash();
            const scenario = TUTORIAL_SCENARIOS.gathererEffect;

            applyFixture(game, scenario.fixture, { skipValidation: true });

            // Verify initial state
            expect(game.get('e4')).toEqual({ type: 'o', color: 'w', role: 'gatherer' });
            expect(game.getCoral('f5')).toBeNull();
            expect(game.getCoralRemaining('w')).toBe(17);
            expect(game.getCoralRemaining('b')).toBe(17);

            // Get available moves for the octopus
            const moves = game.moves({ verbose: true, square: 'e4' });
            console.log('Available moves from e4:', moves);

            // Should have a move to f5
            const moveToF5 = moves.filter((m) => m.from === 'e4' && m.to === 'f5');
            expect(moveToF5.length).toBeGreaterThan(0);

            // Should have options for coral placement (true) and no placement (false)
            const moveWithPlacement = moveToF5.find((m) => m.coralPlaced === true);
            const moveWithoutPlacement = moveToF5.find((m) => m.coralPlaced === false);

            expect(moveWithPlacement).toBeDefined();
            expect(moveWithoutPlacement).toBeDefined();

            // Make the move with coral placement (from autoplay sequence)
            const move = scenario.autoPlaySequence.moves[0];
            const result = game.move(move);

            expect(result).toBeDefined();
            expect(result.coralPlaced).toBe(true);
            expect(game.get('f5')).toEqual({ type: 'o', color: 'w', role: 'gatherer' });
            expect(game.getCoral('f5')).toBe('w');
            expect(game.getCoralRemaining('w')).toBe(16); // White coral used
            expect(game.getCoralRemaining('b')).toBe(17);
        });
    });

    describe('Whale Rotation', () => {
        it('should rotate whale from horizontal to vertical position', () => {
            const game = new CoralClash();
            const scenario = TUTORIAL_SCENARIOS.whaleRotation;

            applyFixture(game, scenario.fixture, { skipValidation: true });

            // Verify initial state - whale at d4-e4 (horizontal)
            const initialPos = game.whalePositions();
            expect(initialPos.w).toEqual(['d4', 'e4']);

            // Get all whale moves
            const moves = game.moves({ verbose: true, piece: 'h' });
            console.log('\n=== Whale Rotation Test ===');
            console.log('Initial whale position:', game.whalePositions().w);
            console.log('Total whale moves:', moves.length);

            // Check moves from d4 to d5 (showing d4 and d5 as green squares)
            const movesD4ToD5 = moves.filter((m) => m.from === 'd4' && m.to === 'd5');
            console.log('\nMoves from d4 to d5:', movesD4ToD5.length);
            movesD4ToD5.forEach((m) => {
                console.log(`  - whaleSecondSquare: ${m.whaleSecondSquare}, san: ${m.san}`);
            });
            const rotationMoveD4ToD5 = movesD4ToD5.find((m) => m.whaleSecondSquare === 'd4');
            console.log('Rotation move (d4->d5, second at d4):', !!rotationMoveD4ToD5);

            // Also check moves from e4 (e4 moves to d5, d4 stays)
            const movesFromE4 = moves.filter((m) => m.from === 'e4' && m.to === 'd5');
            console.log('\nMoves from e4 to d5:', movesFromE4.length);
            movesFromE4.forEach((m) => {
                console.log(`  - whaleSecondSquare: ${m.whaleSecondSquare}, san: ${m.san}`);
            });
            const rotationMoveE4 = movesFromE4.find((m) => m.whaleSecondSquare === 'd4');
            console.log('Rotation move (e4->d5, second at d4):', !!rotationMoveE4);

            // Prefer the move from d4 to d5 (shows green circles at d4 and d5)
            const rotationMove = rotationMoveD4ToD5 || rotationMoveE4;
            expect(rotationMove).toBeDefined();

            console.log('\nPreferred move for UI:', {
                from: rotationMove?.from,
                to: rotationMove?.to,
                whaleSecondSquare: rotationMove?.whaleSecondSquare,
            });

            // Make the rotation move (from autoplay sequence)
            const move = scenario.autoPlaySequence.moves[0];
            console.log('\nAutoplay move:', move);

            // The move should specify whaleSecondSquare to disambiguate
            const result = game.move(move);

            console.log('Result move:', {
                from: result.from,
                to: result.to,
                whaleSecondSquare: result.whaleSecondSquare,
            });
            console.log('Final whale position:', game.whalePositions().w);

            expect(result).toBeDefined();
            // After rotation, whale should be at d4-d5 (vertical) - order returned may vary
            const finalPos = game.whalePositions().w;
            expect(finalPos).toContain('d4');
            expect(finalPos).toContain('d5');

            console.log(
                '\n✓ Whale successfully rotated from horizontal (d4-e4) to vertical (d4-d5)',
            );
            console.log('✓ UI will show green circles at d4 and d5 (final positions)');
        });
    });

    describe('Crab Movement', () => {
        it('should allow crab to move one square orthogonally', () => {
            const game = new CoralClash();
            // @ts-ignore - autoPlaySequence may not exist
            const scenario = TUTORIAL_SCENARIOS.crabMovement;

            // @ts-ignore - autoPlaySequence exists in runtime
            if (!scenario.autoPlaySequence?.moves?.length) {
                console.log('Skipping - no autoplay moves for crab movement scenario');
                return;
            }

            applyFixture(game, scenario.fixture, { skipValidation: true });

            // Verify crab can move
            // @ts-ignore - autoPlaySequence exists in runtime
            const move = scenario.autoPlaySequence.moves[0];
            const result = game.move(move);

            expect(result).toBeDefined();
            expect(result.piece).toBe('c');
        });
    });

    describe('Octopus Movement', () => {
        it('should allow octopus to move one square diagonally', () => {
            const game = new CoralClash();
            // @ts-ignore - autoPlaySequence may not exist
            const scenario = TUTORIAL_SCENARIOS.octopusMovement;

            // @ts-ignore - autoPlaySequence exists in runtime
            if (!scenario.autoPlaySequence?.moves?.length) {
                console.log('Skipping - no autoplay moves for octopus movement scenario');
                return;
            }

            applyFixture(game, scenario.fixture, { skipValidation: true });

            // Verify octopus can move
            // @ts-ignore - autoPlaySequence exists in runtime
            const move = scenario.autoPlaySequence.moves[0];
            const result = game.move(move);

            expect(result).toBeDefined();
            expect(result.piece).toBe('o');
        });
    });

    describe('Turtle Movement', () => {
        it('should allow turtle to slide orthogonally', () => {
            const game = new CoralClash();
            // @ts-ignore - autoPlaySequence may not exist
            const scenario = TUTORIAL_SCENARIOS.turtleMovement;

            // @ts-ignore - autoPlaySequence exists in runtime
            if (!scenario.autoPlaySequence?.moves?.length) {
                console.log('Skipping - no autoplay moves for turtle movement scenario');
                return;
            }

            applyFixture(game, scenario.fixture, { skipValidation: true });

            // Verify turtle can move
            // @ts-ignore - autoPlaySequence exists in runtime
            const move = scenario.autoPlaySequence.moves[0];
            const result = game.move(move);

            expect(result).toBeDefined();
            expect(result.piece).toBe('t');
        });
    });

    describe('Pufferfish Movement', () => {
        it('should allow pufferfish to slide diagonally', () => {
            const game = new CoralClash();
            // @ts-ignore - autoPlaySequence may not exist
            const scenario = TUTORIAL_SCENARIOS.pufferfishMovement;

            // @ts-ignore - autoPlaySequence exists in runtime
            if (!scenario.autoPlaySequence?.moves?.length) {
                console.log('Skipping - no autoplay moves for pufferfish movement scenario');
                return;
            }

            applyFixture(game, scenario.fixture, { skipValidation: true });

            // Verify pufferfish can move
            // @ts-ignore - autoPlaySequence exists in runtime
            const move = scenario.autoPlaySequence.moves[0];
            const result = game.move(move);

            expect(result).toBeDefined();
            expect(result.piece).toBe('f');
        });
    });

    describe('Dolphin Movement', () => {
        it('should allow dolphin to move in any direction', () => {
            const game = new CoralClash();
            // @ts-ignore - autoPlaySequence may not exist
            const scenario = TUTORIAL_SCENARIOS.dolphinMovement;

            // @ts-ignore - autoPlaySequence exists in runtime
            if (!scenario.autoPlaySequence?.moves?.length) {
                console.log('Skipping - no autoplay moves for dolphin movement scenario');
                return;
            }

            applyFixture(game, scenario.fixture, { skipValidation: true });

            // Verify dolphin can move and capture
            // @ts-ignore - autoPlaySequence exists in runtime
            const move = scenario.autoPlaySequence.moves[0];
            const result = game.move(move);

            expect(result).toBeDefined();
            expect(result.piece).toBe('d');
            // Dolphin should capture the crab
            expect(result.captured).toBe('c');
        });
    });

    describe('Whale Movement', () => {
        it('should allow whale to slide as a 2-square piece', () => {
            const game = new CoralClash();
            // @ts-ignore - autoPlaySequence may not exist
            const scenario = TUTORIAL_SCENARIOS.whaleMovement;

            // @ts-ignore - autoPlaySequence exists in runtime
            if (!scenario.autoPlaySequence?.moves?.length) {
                console.log('No autoplay moves for whale movement scenario');
                return;
            }

            applyFixture(game, scenario.fixture, { skipValidation: true });

            // Verify whale can move
            // @ts-ignore - autoPlaySequence exists in runtime
            const move = scenario.autoPlaySequence.moves[0];
            const result = game.move(move);

            expect(result).toBeDefined();
            expect(result.piece).toBe('h');
        });
    });

    describe('Capture', () => {
        it('should allow pieces to capture opponent pieces', () => {
            const game = new CoralClash();
            const scenario = TUTORIAL_SCENARIOS.capture;

            if (!scenario.autoPlaySequence?.moves?.length) {
                console.log('No autoplay moves for capture scenario');
                return;
            }

            applyFixture(game, scenario.fixture, { skipValidation: true });

            // Verify capture move
            const move = scenario.autoPlaySequence.moves[0];
            const result = game.move(move);

            expect(result).toBeDefined();
            expect(result.captured).toBeDefined();
        });
    });

    describe('Whale Coral Exception', () => {
        it('should allow whale to move through its own coral', () => {
            const game = new CoralClash();
            const scenario = TUTORIAL_SCENARIOS.whaleCoralException;

            if (!scenario.autoPlaySequence?.moves?.length) {
                console.log('No autoplay moves for whale coral exception scenario');
                return;
            }

            applyFixture(game, scenario.fixture, { skipValidation: true });

            // Verify whale can move through own coral
            const move = scenario.autoPlaySequence.moves[0];
            const result = game.move(move);

            expect(result).toBeDefined();
            expect(result.piece).toBe('h');
        });
    });

    describe('All Scenarios Load Successfully', () => {
        it('should load all scenario fixtures without errors', () => {
            const scenarioIds = Object.keys(TUTORIAL_SCENARIOS);

            scenarioIds.forEach((id) => {
                // @ts-ignore - dynamic key access
                const scenario = TUTORIAL_SCENARIOS[id];
                expect(scenario).toBeDefined();
                expect(scenario.fixture).toBeDefined();
                expect(scenario.fixture.state).toBeDefined();

                // Try to load each fixture
                const game = new CoralClash();
                expect(() => {
                    applyFixture(game, scenario.fixture, { skipValidation: true });
                }).not.toThrow();
            });

            console.log(`\n✓ All ${scenarioIds.length} scenarios loaded successfully`);
        });
    });
});
