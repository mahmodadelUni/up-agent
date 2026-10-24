import { defineConfig, devices } from "@playwright/test";

// Specs in e2e/ are written by /graduate-test. Credentials come from .env (APP_* variables).
try {
  process.loadEnvFile(".env");
} catch {
  // no .env file: rely on variables already set in the environment
}

export default defineConfig({
  testDir: "./e2e",
  timeout: 60_000,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.BASE_URL || "https://uatfleet.noor.city",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
