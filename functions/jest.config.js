module.exports = {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.js'],
    testPathIgnorePatterns: ['/node_modules/', '/__tests__/setup.js'],
    collectCoverageFrom: [
        'routes/**/*.js',
        'utils/**/*.js',
        '!utils/notifications.js', // Skip notifications for now
    ],
    coveragePathIgnorePatterns: ['/node_modules/'],
    setupFilesAfterEnv: ['<rootDir>/__tests__/setup.js'],
    // Transform shared TypeScript files
    transformIgnorePatterns: ['node_modules/(?!(firebase-admin|firebase-functions|@firebase)/)'],
    moduleNameMapper: {
        '^../shared/dist/game$': '<rootDir>/../shared/dist/game/index.js',
    },
};
