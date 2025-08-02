export default {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  collectCoverageFrom: [
    'lib/**/*.js',
    '!lib/**/*.test.js',
  ],
}; 