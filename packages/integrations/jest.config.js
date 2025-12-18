/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/*.spec.ts"],
  collectCoverageFrom: ["src/**/*.ts"],
  coverageDirectory: "<rootDir>/coverage",
};

