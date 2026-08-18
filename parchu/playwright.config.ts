// Carga .env para que los pasos dispongan de ADMIN_EMAIL/ADMIN_PASSWORD.
import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "tests/features/**/*.feature",
  steps: "tests/steps/**/*.ts",
  language: "es",
});

const PORT = 3100;
const BASE_URL = `http://localhost:${PORT}`;

export default defineConfig({
  // Los escenarios comparten la base de datos y usan correos fijos del
  // Gherkin (ana@uni.edu): deben ejecutarse en serie.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
  },
  projects: [
    // Escenarios Gherkin generados por playwright-bdd.
    {
      name: "bdd",
      testDir,
      use: { ...devices["Desktop Chrome"] },
    },
    // Protección de rutas: exigida por la definición de hecho, sin escenario
    // Gherkin propio.
    {
      name: "guards",
      testDir: "./tests/e2e",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI
      ? `npm run start -- --port ${PORT}`
      : `npm run dev -- --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
