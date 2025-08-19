export default {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'lib/**/*.js',
    'middleware/**/*.js',
    '!lib/**/*.test.js',
    '!middleware/**/*.test.js',
  ],
  transform: {},
  preset: undefined,
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
}; 