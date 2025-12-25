import {
    calculateOptimalMoveTime,
    getTimeControlForDifficulty
} from '../v1.0.0/aiConfig';
import { findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';
import { CoralClash } from '../v1.0.0/coralClash';
import { createGameSnapshot } from '../v1.0.0/gameState';

describe('AI Time Limit', () => {
    describe('calculateOptimalMoveTime', () => {
        it('should use default max time when no time remaining is provided', () => {
            const time = calculateOptimalMoveTime('easy');
            const defaults = getTimeControlForDifficulty('easy');
            expect(time).toBe(defaults.maxTimeMs);
        });

        it('should scale down time when time remaining is low', () => {
            // 20 seconds remaining
            const timeRemaining = 20000;
            const time = calculateOptimalMoveTime('easy', timeRemaining);
            // Should be approx 1/20th = 1000ms
            expect(time).toBeLessThanOrEqual(1000);
            expect(time).toBeGreaterThan(0);
        });

        it('should respect minimum time limit even with low time remaining', () => {
            // Very low time, but enough for min move
            const timeRemaining = 500;
            const defaults = getTimeControlForDifficulty('easy');
            const time = calculateOptimalMoveTime('easy', timeRemaining);
            // Should be at least minTimeMs (100ms) but not more than timeRemaining
            expect(time).toBeGreaterThanOrEqual(defaults.minTimeMs);
            expect(time).toBeLessThanOrEqual(timeRemaining);
        });

        it('should return 0 or small buffer when practically no time left', () => {
            const timeRemaining = 40; // Less than 50ms buffer
            const time = calculateOptimalMoveTime('easy', timeRemaining);
            expect(time).toBe(0);
        });
    });

    describe('Search Timeout', () => {
         // Increase timeout for this test suite
         jest.setTimeout(10000);

        it('should respect strict time limit in search', () => {
            const game = new CoralClash();
            // Create a complex position or just start game
            
            const maxTimeMs = 50; // Very short time
            const start = Date.now();
            
            findBestMoveIterativeDeepening(
                createGameSnapshot(game),
                20, // High depth
                'w',
                maxTimeMs
            );
            
            const elapsed = Date.now() - start;
            // Should finish reasonably close to maxTimeMs. 
            // Allow some buffer for overhead, but it shouldn't be seconds.
            expect(elapsed).toBeLessThan(maxTimeMs + 200); 
        });
    });
});
