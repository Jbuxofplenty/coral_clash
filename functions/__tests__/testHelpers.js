/**
 * Test Helpers for Firebase Functions
 * Provides reusable mock setup for firebase-admin and other common dependencies
 */

import test from 'firebase-functions-test';

// Initialize firebase-functions-test
export const testEnv = test();

/**
 * Creates a standard Firestore mock setup
 * Returns mock functions that can be controlled in tests
 */
export function createFirestoreMocks() {
    const mockGet = jest.fn();
    const mockSet = jest.fn();
    const mockUpdate = jest.fn();
    const mockDelete = jest.fn();
    const mockAdd = jest.fn();
    const mockWhere = jest.fn();
    const mockOrderBy = jest.fn();
    const mockLimit = jest.fn();
    const mockServerTimestamp = jest.fn(() => 'MOCK_TIMESTAMP');
    const mockIncrement = jest.fn((value) => `MOCK_INCREMENT_${value}`);
    const mockArrayUnion = jest.fn((...values) => ({ arrayUnion: values }));
    const mockArrayRemove = jest.fn((...values) => ({ arrayRemove: values }));
    const mockBatch = jest.fn(() => ({
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        commit: jest.fn().mockResolvedValue(),
    }));

    const createMockDocRef = () => ({
        get: mockGet,
        set: mockSet,
        update: mockUpdate,
        delete: mockDelete,
        collection: jest.fn((_collectionName) => ({
            doc: createMockDocRef,
            add: mockAdd,
            where: mockWhere,
            orderBy: mockOrderBy,
            limit: mockLimit,
            get: mockGet,
        })),
    });

    const mockDoc = jest.fn(createMockDocRef);
    const mockCollection = jest.fn(() => ({
        doc: mockDoc,
        add: mockAdd,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        get: mockGet,
    }));

    return {
        mockGet,
        mockSet,
        mockUpdate,
        mockDelete,
        mockAdd,
        mockWhere,
        mockOrderBy,
        mockLimit,
        mockDoc,
        mockCollection,
        mockServerTimestamp,
        mockIncrement,
        mockArrayUnion,
        mockArrayRemove,
        mockBatch,
    };
}

/**
 * Creates firebase-admin mock factory
 * Call this inside jest.mock('firebase-admin', () => createFirebaseAdminMock(mocks))
 */
export function createFirebaseAdminMock(mocks) {
    return {
        initializeApp: jest.fn(),
        firestore: jest.fn(() => ({
            collection: (...args) => mocks.mockCollection(...args),
            batch: (...args) => mocks.mockBatch(...args),
            FieldValue: {
                serverTimestamp: (...args) => mocks.mockServerTimestamp(...args),
                increment: (...args) => mocks.mockIncrement(...args),
                arrayUnion: (...args) => mocks.mockArrayUnion(...args),
                arrayRemove: (...args) => mocks.mockArrayRemove(...args),
            },
        })),
    };
}

/**
 * Standard mock setup for most tests
 * Usage - Copy this boilerplate to your test file:
 *
 * ```javascript
 * import { setupStandardMocks, cleanup } from './testHelpers.js';
 *
 * const mocks = setupStandardMocks();
 *
 * jest.mock('../shared/dist/game/index.js');
 *
 * jest.mock('firebase-admin', () => ({
 *     initializeApp: jest.fn(),
 *     firestore: jest.fn(() => ({
 *         collection: (...args) => mocks.mockCollection(...args),
 *         batch: (...args) => mocks.mockBatch(...args),
 *         FieldValue: {
 *             serverTimestamp: (...args) => mocks.mockServerTimestamp(...args),
 *             increment: (...args) => mocks.mockIncrement(...args),
 *             arrayUnion: (...args) => mocks.mockArrayUnion(...args),
 *             arrayRemove: (...args) => mocks.mockArrayRemove(...args),
 *         },
 *     })),
 * }));
 *
 * // For tests that also need @google-cloud/tasks mocked:
 * jest.mock('@google-cloud/tasks');
 *
 * // For tests that need notifications mocked:
 * jest.mock('../utils/notifications.js');
 *
 * import * as myModule from '../routes/myModule.js';
 *
 * describe('My Tests', () => {
 *     beforeEach(() => {
 *         jest.clearAllMocks();
 *     });
 *
 *     afterAll(() => {
 *         cleanup();
 *     });
 *
 *     // Use mocks.mockGet, mocks.mockSet, etc. in your tests
 * });
 * ```
 */
export function setupStandardMocks() {
    return createFirestoreMocks();
}

/**
 * Cleanup function to call after all tests
 */
export function cleanup() {
    testEnv.cleanup();
}
