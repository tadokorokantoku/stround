module.exports = {
  preset: 'react-native',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/../backend/',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-vector-icons|react-native-paper|@expo|expo|@tanstack)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx'],
  testMatch: [
    '**/__tests__/**/*.(ts|tsx|js)',
    '**/*.(test|spec).(ts|tsx|js)',
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/__tests__/**',
    '!src/**/node_modules/**',
  ],
  coverageReporters: ['text', 'lcov', 'html'],
  coverageDirectory: 'coverage',
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};