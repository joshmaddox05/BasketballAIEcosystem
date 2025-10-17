module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node', // Use node environment to avoid React Native issues
  testMatch: ['**/__tests__/**/*.test.{js,ts,tsx}'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  collectCoverageFrom: [
    '**/*.{ts,tsx}',
    '!**/coverage/**',
    '!**/node_modules/**',
    '!**/babel.config.js',
    '!**/jest.setup.js',
  ],
};
