import { defineConfig, devices } from "@playwright/test";

const desktop = {
  ...devices["Desktop Chrome"],
  viewport: { width: 1280, height: 900 },
};

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 90000,
  expect: { timeout: 15000 },
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  globalSetup: "./global-setup.js",
  globalTeardown: "./global-teardown.js",
  use: {
    baseURL: "http://127.0.0.1:5099",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    permissions: ["camera", "microphone"],
    launchOptions: {
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
    },
  },
  projects: [
    { name: "demo", testMatch: /demo\.spec\.js/, use: desktop },
    {
      name: "chromium",
      testIgnore: /demo\.spec\.js/,
      dependencies: ["demo"],
      use: desktop,
    },
  ],
});
