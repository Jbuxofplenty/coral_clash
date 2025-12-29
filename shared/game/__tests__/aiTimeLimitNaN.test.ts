
import { calculateOptimalMoveTime } from '../v1.0.0/aiConfig';

describe('AI Time Limit NaN Handling', () => {
    it('should return a valid safe fallback when timeRemainingMs is NaN', () => {
        // Using 'easy' difficulty where maxTimeMs is 5000
        const result = calculateOptimalMoveTime('easy', NaN);
        
        // Should NOT be NaN
        expect(Number.isNaN(result)).toBe(false);
        // Should fall back to maxTimeMs (5000) or similar safe value
        expect(result).toBe(5000);
    });

    it('should return a valid safe fallback when timeRemainingMs is non-finite Infinity', () => {
        const result = calculateOptimalMoveTime('easy', Infinity);
        expect(Number.isNaN(result)).toBe(false);
        // Infinity time -> maxTimeMs
        expect(result).toBe(5000);
    });

    it('should handle negative timeRemaining (expired) gracefully', () => {
        const result = calculateOptimalMoveTime('easy', -1000);
        expect(Number.isNaN(result)).toBe(false);
        // Should be 0 or small minimum
        expect(result).toBeLessThanOrEqual(100);
    });
});
