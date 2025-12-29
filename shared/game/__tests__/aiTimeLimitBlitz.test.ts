/**
 * Test case for reproducing AI time limit issues in Blitz mode
 */

import { calculateOptimalMoveTime } from '../v1.0.0/aiConfig';
import { findBestMoveIterativeDeepening } from '../v1.0.0/aiEvaluation';
import { CoralClash } from '../v1.0.0/coralClash';
import { createGameSnapshot } from '../v1.0.0/gameState';

describe('AI Time Limit in Blitz Mode', () => {
    
    describe('calculateOptimalMoveTime', () => {
        it('should return approximately 1/20th of remaining time for Blitz scenarios', () => {
            // Blitz Scenario: 30 seconds remaining (30000ms)
            // Difficulty: easy (Max 5000ms)
            // Expected: 30000 / 20 = 1500ms
            
            const timeRemaining = 30000;
            const optimalTime = calculateOptimalMoveTime('easy', timeRemaining);
            
            expect(optimalTime).toBeLessThanOrEqual(1600); // Allow valid buffer
            expect(optimalTime).toBeGreaterThanOrEqual(1400);
            
            // It should be much less than the max cap (5000ms)
            expect(optimalTime).toBeLessThan(5000);
        });

        it('should return approximately 1/20th of remaining time for very low time', () => {
            // Low Time: 5 seconds remaining (5000ms)
            // Difficulty: easy
            // Expected: 5000 / 20 = 250ms
            
            const timeRemaining = 5000;
            const optimalTime = calculateOptimalMoveTime('easy', timeRemaining);
            
            expect(optimalTime).toBeLessThanOrEqual(300); 
            expect(optimalTime).toBeGreaterThanOrEqual(200);
        });
        
        it('should respect maxTimeMs cap when time is plentiful', () => {
             // Plentiful Time: 5 minutes remaining (300000ms)
             // Difficulty: easy (Max 5000ms)
             // 1/20th = 15000ms
             // Expected: Cap at 5000ms
             
             const timeRemaining = 300000;
             const optimalTime = calculateOptimalMoveTime('easy', timeRemaining);
             
             expect(optimalTime).toBe(5000);
        });
    });

    describe('findBestMoveIterativeDeepening Time Adherence', () => {
        // We use a complex fixture or ensure the search does some work
        // Mocking Date.now() or using loose assertions might be needed if tests are flaky
        
        it('should respect a short allocated time (e.g. 200ms)', () => {
            const game = new CoralClash();
            // Create a complex enough position to ensure it doesn't just finish depth 2 instantly
            // Or assume initial position takes > 0ms
            
            const snapshot = createGameSnapshot(game);
            const maxTimeMs = 200;
            
            const result = findBestMoveIterativeDeepening(
                snapshot,
                6, // Request deep search
                'w',
                maxTimeMs,
                null,
                null,
                'easy'
            );
            
            // The result.elapsedMs is what the AI *thinks* it took
            // We verify it didn't wildly exceed
            expect(result.elapsedMs).toBeLessThan(maxTimeMs + 100); // 100ms tolerance
        });
        
        it('should respect a tiny time limit (50ms) even if it implies breaking early', () => {
             const game = new CoralClash();
             const snapshot = createGameSnapshot(game);
             const maxTimeMs = 50;
             
             const result = findBestMoveIterativeDeepening(
                 snapshot,
                 6,
                 'w',
                 maxTimeMs,
                 null,
                 null,
                 'easy'
             );
             
             expect(result.elapsedMs).toBeLessThan(maxTimeMs + 50);
        });
    });
});
