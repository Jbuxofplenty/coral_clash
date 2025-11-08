export default {
    testEnvironment: 'node',
    transform: {
        '^.+\\.js$': 'babel-jest',
    },
    testMatch: ['<rootDir>/__tests__/**/*.test.js'],
    moduleNameMapper: {
        '^@jbuxofplenty/coral-clash$': '<rootDir>/__mocks__/@jbuxofplenty/coral-clash.js',
    },
    coveragePathIgnorePatterns: ['/node_modules/', '/__tests__/', '/__mocks__/', '/shared/'],
    testPathIgnorePatterns: ['/node_modules/', '/shared/'],
};
