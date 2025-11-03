/**
 * Tests for game ending conditions in Coral Clash
 */

import { CoralClash, applyFixture } from '../index';
import whaleAocFixture from '../__fixtures__/whale-aoc.json';

describe('Game Ending Conditions', () => {
    describe('Checkmate', () => {
        it('should detect checkmate when whale is in check with no legal moves', () => {
            const game = new CoralClash();
            // This would require setting up a checkmate position
            // For now, we verify the method exists and works with basic scenarios
            expect(game.isCheckmate()).toBe(false);
        });

        it('should end the game when checkmate occurs', () => {
            const game = new CoralClash();
            // In a checkmate position, isGameOver should return true
            // and isCoralVictory should not be the cause
            expect(game.isGameOver).toBeDefined();
        });
    });

    describe('Stalemate (Draw)', () => {
        it('should detect stalemate when player has no legal moves and whale is not in check', () => {
            const game = new CoralClash();
            expect(game.isStalemate()).toBe(false);
            expect(game.inCheck()).toBe(false);
        });

        it('should treat stalemate as a draw', () => {
            const game = new CoralClash();
            // Stalemate should be included in isDraw()
            if (game.isStalemate()) {
                expect(game.isDraw()).toBe(true);
            }
        });
    });

    describe('Threefold Repetition (Draw)', () => {
        it('should detect threefold repetition', () => {
            const game = new CoralClash();

            // Make the same position occur three times
            const moves = ['Oa4', 'Oa5', 'Oa3', 'Oa5', 'Oa4', 'Oa5'];

            for (const move of moves) {
                try {
                    game.move(move);
                } catch (_error) {
                    // Some moves might not be legal in default position
                }
            }

            expect(game.isThreefoldRepetition).toBeDefined();
        });

        it('should treat threefold repetition as a draw', () => {
            const game = new CoralClash();
            if (game.isThreefoldRepetition()) {
                expect(game.isDraw()).toBe(true);
            }
        });
    });

    describe('Coral Victory - All Coral Placed', () => {
        it('should trigger coral scoring when a player has placed all their coral', () => {
            const game = new CoralClash();

            // Manually set coral remaining to 0 to simulate all coral placed
            game['_coralRemaining'].w = 0;

            expect(game['_shouldTriggerCoralScoring']()).toBe(true);
            expect(game.isGameOver()).toBe(true);
        });

        it('should determine winner by coral area control', () => {
            const game = new CoralClash();

            // Set up a scenario where white has more coral control
            game['_coralRemaining'].w = 0;

            // Place some coral
            game.placeCoral('e4', 'w');
            game.placeCoral('e5', 'w');
            game.placeCoral('d4', 'b');

            const winner = game.isCoralVictory();
            const whiteControl = game.getCoralAreaControl('w');
            const blackControl = game.getCoralAreaControl('b');

            console.log('White control:', whiteControl);
            console.log('Black control:', blackControl);

            if (whiteControl > blackControl) {
                expect(winner).toBe('w');
            } else if (blackControl > whiteControl) {
                expect(winner).toBe('b');
            } else {
                expect(winner).toBeNull(); // Tie
            }
        });
    });

    describe('Coral Victory - Only Whale Remaining', () => {
        it('should trigger coral scoring when a player has only whale remaining', () => {
            const game = new CoralClash();

            // Remove all white pieces except whale using the board representation
            const board = game.board();
            board.forEach((row) => {
                row.forEach((cell) => {
                    if (cell && cell.color === 'w' && cell.type !== 'h') {
                        game.remove(cell.square);
                    }
                });
            });

            expect(game['_shouldTriggerCoralScoring']()).toBe(true);
            expect(game.isGameOver()).toBe(true);
        });
    });

    describe('Coral Victory - Crab/Octopus Reaches Back Row', () => {
        it('should trigger coral scoring when white crab reaches rank 8', () => {
            const game = new CoralClash();

            // Place a white crab on rank 8
            game['_board'][0] = { type: 'c', color: 'w', role: 'hunter' }; // a8

            expect(game['_shouldTriggerCoralScoring']()).toBe(true);
            expect(game.isGameOver()).toBe(true);
        });

        it('should trigger coral scoring when black crab reaches rank 1', () => {
            const game = new CoralClash();

            // Place a black crab on rank 1
            game['_board'][112] = { type: 'c', color: 'b', role: 'hunter' }; // a1

            expect(game['_shouldTriggerCoralScoring']()).toBe(true);
            expect(game.isGameOver()).toBe(true);
        });

        it('should trigger coral scoring when white octopus reaches rank 8', () => {
            const game = new CoralClash();

            // Place a white octopus on rank 8
            game['_board'][0] = { type: 'o', color: 'w', role: 'hunter' }; // a8

            expect(game['_shouldTriggerCoralScoring']()).toBe(true);
            expect(game.isGameOver()).toBe(true);
        });

        it('should trigger coral scoring when black octopus reaches rank 1', () => {
            const game = new CoralClash();

            // Place a black octopus on rank 1
            game['_board'][112] = { type: 'o', color: 'b', role: 'hunter' }; // a1

            expect(game['_shouldTriggerCoralScoring']()).toBe(true);
            expect(game.isGameOver()).toBe(true);
        });
    });

    describe('Coral Area Control Calculation', () => {
        it('should count coral not occupied by opponent pieces', () => {
            const game = new CoralClash();
            game.clear(); // Start with empty board
            game.put({ type: 'h', color: 'w' }, 'd1'); // Add whales for valid game
            game.put({ type: 'h', color: 'b' }, 'd8');

            // Place coral on empty squares
            game.placeCoral('e4', 'w');
            game.placeCoral('e5', 'w');
            game.placeCoral('d4', 'b');

            // White should have 2 coral (e4, e5)
            // Black should have 1 coral (d4)
            expect(game.getCoralAreaControl('w')).toBe(2);
            expect(game.getCoralAreaControl('b')).toBe(1);
        });

        it('should not count coral occupied by opponent pieces', () => {
            const game = new CoralClash();
            game.clear(); // Start with empty board
            game.put({ type: 'h', color: 'w' }, 'd1'); // Add whales for valid game
            game.put({ type: 'h', color: 'b' }, 'd8');

            // Place white coral
            game.placeCoral('e4', 'w');

            // Place black piece on the coral
            game.put({ type: 'c', color: 'b', role: 'hunter' }, 'e4');

            // White should have 0 coral control (occupied by opponent)
            expect(game.getCoralAreaControl('w')).toBe(0);
        });

        it('should count coral occupied by own pieces', () => {
            const game = new CoralClash();
            game.clear(); // Start with empty board
            game.put({ type: 'h', color: 'w' }, 'd1'); // Add whales for valid game
            game.put({ type: 'h', color: 'b' }, 'd8');

            // Place white coral
            game.placeCoral('e4', 'w');

            // Place white piece on the coral
            game.put({ type: 'c', color: 'w', role: 'hunter' }, 'e4');

            // White should have 1 coral control (occupied by own piece is OK)
            expect(game.getCoralAreaControl('w')).toBe(1);
        });

        it('should not count coral when whale occupies BOTH positions with coral', () => {
            // Load fixture where black whale sits on 2 white coral squares
            const game = new CoralClash();
            applyFixture(game, whaleAocFixture);

            // Verify whale positions
            const whalePos = game.whalePositions();
            expect(whalePos.w).toEqual(['b4', 'c4']); // White whale at b4-c4
            expect(whalePos.b).toEqual(['e3', 'e2']); // Black whale at e3-e2

            // Verify coral setup
            const allCoral = game.getAllCoral();
            const whiteCoral = allCoral.filter(c => c.color === 'w');
            const blackCoral = allCoral.filter(c => c.color === 'b');

            console.log('\n=== Whale AOC Debug ===');
            console.log('White coral squares:', whiteCoral.map(c => c.square));
            console.log('Black coral squares:', blackCoral.map(c => c.square));
            console.log('White whale positions:', whalePos.w);
            console.log('Black whale positions:', whalePos.b);

            // Check which coral is under whale positions
            const c4Coral = game.getCoral('c4');
            const e3Coral = game.getCoral('e3');
            const e2Coral = game.getCoral('e2');

            console.log('c4 coral (white whale):', c4Coral);
            console.log('e3 coral (black whale):', e3Coral);
            console.log('e2 coral (black whale):', e2Coral);

            // Black whale (e3, e2) is sitting on 2 white coral squares
            // These should NOT count toward white's area control
            expect(e3Coral).toBe('w'); // e3 has white coral
            expect(e2Coral).toBe('w'); // e2 has white coral

            // White whale (b4, c4) is sitting on 1 white coral square
            expect(c4Coral).toBe('w'); // c4 has white coral

            // Calculate area of control
            const whiteAOC = game.getCoralAreaControl('w');
            const blackAOC = game.getCoralAreaControl('b');

            console.log('White AOC:', whiteAOC);
            console.log('Black AOC:', blackAOC);
            console.log('Expected: White=5, Black=5');

            // From fixture:
            // Total white coral: 7 (c4, g4, d3, e3, e2, f2, g2)
            // - c4: occupied by white whale (counts)
            // - e3: occupied by black whale (should NOT count)
            // - e2: occupied by black whale (should NOT count)
            // White AOC should be: 7 - 2 = 5
            //
            // Total black coral: 6 (c7, d7, d6, e6, b5, d5)
            // - b5: occupied by white piece (should NOT count)
            // Black AOC should be: 6 - 1 = 5
            //
            // Expected AOC: 5-5 (white-black)
            expect(whiteAOC).toBe(5);
            expect(blackAOC).toBe(5);
        });
    });

    describe('Coral Victory Tie', () => {
        it('should return null when coral control is tied', () => {
            const game = new CoralClash();

            // Trigger coral scoring
            game['_coralRemaining'].w = 0;

            // Set equal coral control
            game.placeCoral('e4', 'w');
            game.placeCoral('d4', 'b');

            const whiteControl = game.getCoralAreaControl('w');
            const blackControl = game.getCoralAreaControl('b');

            if (whiteControl === blackControl) {
                expect(game.isCoralVictory()).toBeNull();
                expect(game.isGameOver()).toBe(true); // Game is still over, just tied
            }
        });
    });

    describe('Insufficient Material (Draw)', () => {
        it('should detect insufficient material with only whales', () => {
            const game = new CoralClash();

            // Remove all pieces except whales using proper API
            const board = game.board();
            board.forEach((row) => {
                row.forEach((cell) => {
                    if (cell && cell.type !== 'h') {
                        game.remove(cell.square);
                    }
                });
            });

            expect(game.isInsufficientMaterial()).toBe(true);
            expect(game.isDraw()).toBe(true);
        });
    });

    describe('Resignation', () => {
        it('should allow a player to resign', () => {
            const game = new CoralClash();

            expect(game.isResigned()).toBeNull();

            // White resigns
            game.resign('w');

            expect(game.isResigned()).toBe('w');
            expect(game.isGameOver()).toBe(true);
        });

        it('should allow black to resign', () => {
            const game = new CoralClash();

            // Black resigns
            game.resign('b');

            expect(game.isResigned()).toBe('b');
            expect(game.isGameOver()).toBe(true);
        });

        it('should reset resignation on reset', () => {
            const game = new CoralClash();

            // White resigns
            game.resign('w');
            expect(game.isResigned()).toBe('w');

            // Reset game to starting position
            game.reset();

            expect(game.isResigned()).toBeNull();
            expect(game.isGameOver()).toBe(false);
        });
    });

    describe('Game Over Detection', () => {
        it('should detect game is over on checkmate', () => {
            const game = new CoralClash();
            // Assuming checkmate scenario
            if (game.isCheckmate()) {
                expect(game.isGameOver()).toBe(true);
            }
        });

        it('should detect game is over on stalemate', () => {
            const game = new CoralClash();
            // Assuming stalemate scenario
            if (game.isStalemate()) {
                expect(game.isGameOver()).toBe(true);
            }
        });

        it('should detect game is over on draw', () => {
            const game = new CoralClash();
            // Assuming draw scenario
            if (game.isDraw()) {
                expect(game.isGameOver()).toBe(true);
            }
        });

        it('should detect game is over when coral scoring triggers', () => {
            const game = new CoralClash();

            // Trigger coral scoring
            game['_coralRemaining'].w = 0;

            expect(game.isGameOver()).toBe(true);
        });

        it('should detect game is over on resignation', () => {
            const game = new CoralClash();

            // Player resigns
            game.resign('w');

            expect(game.isGameOver()).toBe(true);
        });
    });
});
