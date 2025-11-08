import { cleanup, setupStandardMocks } from './testHelpers.js';

const mocks = setupStandardMocks();

// Mock the shared game library before any imports
jest.mock('../shared/dist/game/index.js');

jest.mock('firebase-admin', () => ({
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
}));

// Mock firebase-functions/params for defineSecret
jest.mock('firebase-functions/params', () => ({
    defineSecret: jest.fn((name) => ({ name, value: () => `mock-${name}` })),
}));

// Mock fetch for GitHub API calls
global.fetch = jest.fn();

// Need to import after mocks are setup
let issues;

describe('Issues Functions', () => {
    beforeAll(async () => {
        // Import after mocks are set up
        issues = await import('../routes/issues.js');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        // Reset fetch mock
        global.fetch.mockReset();
        // Set default GitHub PAT in environment
        process.env.GITHUB_PAT = 'test-github-pat-token';
    });

    afterAll(() => {
        cleanup();
        delete process.env.GITHUB_PAT;
    });

    describe('submitIssue', () => {
        it('should create issue with all fields and create GitHub issue', async () => {
            const issueId = 'issue-123';
            const githubIssueNumber = 42;

            mocks.mockAdd.mockResolvedValue({
                id: issueId,
                update: jest.fn().mockResolvedValue(),
            });

            // Mock successful GitHub API call
            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    number: githubIssueNumber,
                    html_url: 'https://github.com/jbuxofplenty/coral_clash/issues/42',
                }),
            });

            const gameSnapshot = {
                fen: '8/8/8/8/8/8/8/8 w - - 0 1',
                turn: 'w',
                isGameOver: false,
                isCheck: false,
            };

            const result = await issues.submitIssueHandler({
                data: {
                    subject: 'Test Issue',
                    description: 'This is a test issue description',
                    gameSnapshot,
                },
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.issueId).toBe(issueId);
            expect(result.githubIssueNumber).toBe(githubIssueNumber);
            expect(mocks.mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'Test Issue',
                    description: 'This is a test issue description',
                    userId: 'test-user-123',
                    gameSnapshot,
                    status: 'open',
                }),
            );
            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/jbuxofplenty/coral_clash/issues',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        Authorization: 'token test-github-pat-token',
                    }),
                }),
            );
        });

        it('should create issue without game snapshot', async () => {
            const issueId = 'issue-456';
            const githubIssueNumber = 43;

            mocks.mockAdd.mockResolvedValue({
                id: issueId,
                update: jest.fn().mockResolvedValue(),
            });

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    number: githubIssueNumber,
                }),
            });

            const result = await issues.submitIssueHandler({
                data: {
                    subject: 'Feedback Issue',
                    description: 'This is general feedback without a game snapshot',
                },
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.issueId).toBe(issueId);
            expect(result.githubIssueNumber).toBe(githubIssueNumber);
            expect(mocks.mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'Feedback Issue',
                    description: 'This is general feedback without a game snapshot',
                    userId: 'test-user-123',
                    gameSnapshot: null,
                    status: 'open',
                }),
            );
        });

        it('should create issue without userId (logged out user)', async () => {
            const issueId = 'issue-789';
            const githubIssueNumber = 44;

            mocks.mockAdd.mockResolvedValue({
                id: issueId,
                update: jest.fn().mockResolvedValue(),
            });

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({
                    number: githubIssueNumber,
                }),
            });

            const result = await issues.submitIssueHandler({
                data: {
                    subject: 'Anonymous Feedback',
                    description: 'This is feedback from a logged out user',
                },
                auth: null, // No authentication
            });

            expect(result.success).toBe(true);
            expect(result.issueId).toBe(issueId);
            expect(result.githubIssueNumber).toBe(githubIssueNumber);
            expect(mocks.mockAdd).toHaveBeenCalledWith(
                expect.objectContaining({
                    subject: 'Anonymous Feedback',
                    description: 'This is feedback from a logged out user',
                    userId: null,
                    status: 'open',
                }),
            );
        });

        it('should succeed even if GitHub issue creation fails', async () => {
            const issueId = 'issue-999';

            const mockUpdate = jest.fn().mockResolvedValue();
            mocks.mockAdd.mockResolvedValue({
                id: issueId,
                update: mockUpdate,
            });

            // Mock GitHub API failure
            global.fetch.mockResolvedValue({
                ok: false,
                status: 500,
                text: async () => 'Internal Server Error',
            });

            const result = await issues.submitIssueHandler({
                data: {
                    subject: 'Test Issue',
                    description: 'This should still be stored in Firestore',
                },
                auth: { uid: 'test-user-123' },
            });

            expect(result.success).toBe(true);
            expect(result.issueId).toBe(issueId);
            expect(result.githubIssueNumber).toBeNull();
            expect(mockUpdate).toHaveBeenCalledWith(
                expect.objectContaining({
                    githubError: expect.any(String),
                }),
            );
        });

        it('should throw error if subject is missing', async () => {
            await expect(
                issues.submitIssueHandler({
                    data: {
                        description: 'This has no subject',
                    },
                    auth: { uid: 'test-user-123' },
                }),
            ).rejects.toThrow('Subject and description are required');
        });

        it('should throw error if description is missing', async () => {
            await expect(
                issues.submitIssueHandler({
                    data: {
                        subject: 'This has no description',
                    },
                    auth: { uid: 'test-user-123' },
                }),
            ).rejects.toThrow('Subject and description are required');
        });

        it('should throw error if subject is too short', async () => {
            await expect(
                issues.submitIssueHandler({
                    data: {
                        subject: 'ab',
                        description: 'This is a valid description',
                    },
                    auth: { uid: 'test-user-123' },
                }),
            ).rejects.toThrow('Subject must be between 3 and 200 characters');
        });

        it('should throw error if subject is too long', async () => {
            await expect(
                issues.submitIssueHandler({
                    data: {
                        subject: 'a'.repeat(201),
                        description: 'This is a valid description',
                    },
                    auth: { uid: 'test-user-123' },
                }),
            ).rejects.toThrow('Subject must be between 3 and 200 characters');
        });

        it('should throw error if description is too short', async () => {
            await expect(
                issues.submitIssueHandler({
                    data: {
                        subject: 'Valid Subject',
                        description: 'short',
                    },
                    auth: { uid: 'test-user-123' },
                }),
            ).rejects.toThrow('Description must be between 10 and 5000 characters');
        });

        it('should throw error if description is too long', async () => {
            await expect(
                issues.submitIssueHandler({
                    data: {
                        subject: 'Valid Subject',
                        description: 'a'.repeat(5001),
                    },
                    auth: { uid: 'test-user-123' },
                }),
            ).rejects.toThrow('Description must be between 10 and 5000 characters');
        });

        it('should include game state details in GitHub issue body', async () => {
            const issueId = 'issue-with-game-state';
            mocks.mockAdd.mockResolvedValue({
                id: issueId,
                update: jest.fn().mockResolvedValue(),
            });

            global.fetch.mockResolvedValue({
                ok: true,
                json: async () => ({ number: 45 }),
            });

            const gameSnapshot = {
                fen: '8/8/8/8/8/8/8/8 w - - 0 1',
                turn: 'b',
                isGameOver: true,
                isCheckmate: true,
                isCheck: false,
            };

            await issues.submitIssueHandler({
                data: {
                    subject: 'Bug with checkmate',
                    description: 'Checkmate not detected properly',
                    gameSnapshot,
                },
                auth: { uid: 'test-user-123' },
            });

            expect(global.fetch).toHaveBeenCalled();
            const fetchCall = global.fetch.mock.calls[0];
            const requestBody = JSON.parse(fetchCall[1].body);
            
            expect(requestBody.title).toBe('Bug with checkmate');
            expect(requestBody.body).toContain('Checkmate not detected properly');
            expect(requestBody.body).toContain('FEN');
            expect(requestBody.body).toContain(gameSnapshot.fen);
            expect(requestBody.body).toContain('Turn');
            expect(requestBody.body).toContain('Checkmate');
            expect(requestBody.labels).toContain('user-reported');
        });
    });
});

