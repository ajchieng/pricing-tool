import { defineConfig, devices } from "@playwright/test";
import { remoteTestOrigin } from "./scripts/e2e-target.mjs";

const remoteOrigin = remoteTestOrigin();

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: process.env.CI ? 2 : 4,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: remoteOrigin ?? "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: "mobile",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: remoteOrigin
    ? undefined
    : {
        command: "node scripts/serve-static.mjs",
        url: "http://127.0.0.1:4173",
        reuseExistingServer: false,
        timeout: 20_000,
      },
});
