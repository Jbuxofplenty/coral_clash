// Test setup for Firebase Functions
// This file runs before all tests

// Mock the shared game library
jest.mock('../shared/dist/game', () => ({
    CoralClash: jest.fn().mockImplementation(() => ({
        fen: jest.fn().mockReturnValue('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'),
        turn: jest.fn().mockReturnValue('w'),
        whalePositions: jest.fn().mockReturnValue({ w: ['d1', 'e1'], b: ['d8', 'e8'] }),
        getAllCoral: jest.fn().mockReturnValue([]),
        getCoralRemainingCounts: jest.fn().mockReturnValue({ w: 5, b: 5 }),
        inCheck: jest.fn().mockReturnValue(false),
        isCheckmate: jest.fn().mockReturnValue(false),
        isGameOver: jest.fn().mockReturnValue(false),
        isCoralVictory: jest.fn().mockReturnValue(null),
        isDraw: jest.fn().mockReturnValue(false),
    })),
    DEFAULT_POSITION: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    createGameSnapshot: jest.fn().mockReturnValue({
        fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        turn: 'w',
        whalePositions: { w: ['d1', 'e1'], b: ['d8', 'e8'] },
        coral: [],
        coralRemaining: { w: 5, b: 5 },
        isCheck: false,
        isCheckmate: false,
        isGameOver: false,
        isCoralVictory: null,
        isDraw: false,
    }),
}));

/**
 * Test wrapper for Firebase Functions v2 callable functions
 *
 * v2 callable functions expect a request object with specific structure.
 * This wrapper transforms v1-style test calls into v2-compatible requests.
 */
class V2CallableWrapper {
    /**
     * Wrap a v2 callable function for testing
     * @param {Function} v2Function - The v2 callable function to wrap
     * @returns {Function} A function that accepts v1-style (data, context) params
     */
    static wrap(v2Function) {
        return async (data, context = {}) => {
            // Mock the Express-like request object that Firebase v2 expects
            const mockRawRequest = {
                on: jest.fn(),
                once: jest.fn(),
                emit: jest.fn(),
                removeListener: jest.fn(),
                removeAllListeners: jest.fn(),
                setMaxListeners: jest.fn(),
                getMaxListeners: jest.fn(),
                listeners: jest.fn(() => []),
                rawListeners: jest.fn(() => []),
                listenerCount: jest.fn(() => 0),
                prependListener: jest.fn(),
                prependOnceListener: jest.fn(),
                eventNames: jest.fn(() => []),
                connection: { encrypted: true },
                headers: { 'content-type': 'application/json' },
                method: 'POST',
                url: '/',
                httpVersion: '1.1',
                body: { data },
            };

            // Mock the Express-like response object
            const mockResponse = {
                status: jest.fn().mockReturnThis(),
                send: jest.fn(),
                json: jest.fn(),
                end: jest.fn(),
                setHeader: jest.fn(),
                getHeader: jest.fn(),
            };

            // Create the request object structure that v2 callable expects
            const request = {
                data,
                auth: context.auth || null,
                rawRequest: mockRawRequest,
                app: null,
                instanceIdToken: null,
            };

            // Firebase v2 uses .run() method on the __endpoint
            if (v2Function.__endpoint?.callableTrigger) {
                // Call through the Firebase infrastructure
                const result = await new Promise((resolve, reject) => {
                    mockResponse.send = (data) => resolve(data);
                    mockResponse.json = (data) => resolve(data);

                    // Set up request body with callable format
                    mockRawRequest.body = { data };
                    if (context.auth) {
                        mockRawRequest.headers.authorization = `Bearer mock-token`;
                    }

                    v2Function(mockRawRequest, mockResponse).catch(reject);
                });
                return result;
            }

            // Fallback: call the function directly (shouldn't reach here for v2)
            return await v2Function(request);
        };
    }
}

// Export for use in tests
global.V2CallableWrapper = V2CallableWrapper;
