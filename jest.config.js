module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  coverageReporters: ['lcov', 'text', 'cobertura'],
  collectCoverage: true,
  collectCoverageFrom: ['**/*.ts'],
};
