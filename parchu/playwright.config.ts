// Prefiere .env.test (Docker local) sobre .env: .env puede apuntar a la base
// de despliegue, y las pruebas nunca deben escribir ahi. dotenv no sobrescribe
// variables ya definidas en process.env, asi que si .env.test define
// DATABASE_URL, un .env con otro valor no lo pisa.
import { existsSync } from "node:fs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: existsSync(".env.test") ? ".env.test" : ".env" });

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
