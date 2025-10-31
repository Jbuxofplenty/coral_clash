export default {
    testEnvironment: 'node',
    testMatch: ['**/__tests__/**/*.test.{js,ts}', '!shared/**'],
    testPathIgnorePatterns: ['/node_modules/', '/shared/'],
    collectCoverageFrom: [
        'routes/**/*.js',
        'utils/**/*.js',
        '!utils/notifications.js', // Skip notifications for now
    ],
    coveragePathIgnorePatterns: ['/node_modules/', '/shared/'],
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    transformIgnorePatterns: ['/node_modules/(?!(firebase-functions|firebase-admin)/)'],
    moduleNameMapper: {
        '^../shared/dist/game$': '<rootDir>/__mocks__/shared-game.js',
        '^../shared/dist/game/index.js$': '<rootDir>/__mocks__/shared-game.js',
    },
};
