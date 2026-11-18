module.exports = {
  preset: 'jest-expo',
  testMatch: ['<rootDir>/tests/**/*.test.ts?(x)'],
  moduleNameMapper: {
    '^@screens/(.*)$': '<rootDir>/src/screens/$1',
    '^@features/(.*)$': '<rootDir>/src/features/$1',
    '^@layouts/(.*)$': '<rootDir>/src/layouts/$1',
    '^@pattern/(.*)$': '<rootDir>/src/pattern/$1',
    '^@ui/(.*)$': '<rootDir>/src/ui/$1',
    '^@core/(.*)$': '<rootDir>/src/core/$1',
  },
};
