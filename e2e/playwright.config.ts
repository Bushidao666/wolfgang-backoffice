import { defineConfig } from "@playwright/test";

const webPort = process.env.E2E_WEB_PORT ?? "3100";
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${webPort}`;

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command: "node scripts/start-env.js",
    url: `${baseURL.replace(/\/+$/, "")}/api/health`,
    reuseExistingServer: process.env.E2E_REUSE_EXISTING_SERVER === "true",
    timeout: 180_000,
  },
});
