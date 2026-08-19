// Prefiere .env.test (Docker local) sobre .env: .env puede apuntar a la base
// de despliegue, y las pruebas nunca deben escribir ahi. dotenv no sobrescribe
// variables ya definidas en process.env, asi que si .env.test define
// DATABASE_URL, un .env con otro valor no lo pisa.
import { existsSync } from "node:fs";
import { config as loadEnv } from "dotenv";

loadEnv({ path: existsSync(".env.test") ? ".env.test" : ".env" });

import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
  },
});
