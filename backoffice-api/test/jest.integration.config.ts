const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  rootDir: "..",
  roots: ["<rootDir>/test/integration"],
  testMatch: ["**/*.e2e-spec.ts"],
  setupFilesAfterEnv: ["<rootDir>/test/setup.ts"],
  testTimeout: 90_000,
  maxWorkers: 1,
};

export default config;
// For Jest (CommonJS) compatibility.
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
module.exports = config;
