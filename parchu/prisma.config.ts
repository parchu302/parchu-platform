// Prisma ya no carga .env cuando existe un prisma.config.ts
// ("Prisma config detected, skipping environment variable loading"),
// asi que lo cargamos explicitamente antes de leer DATABASE_URL.
import "dotenv/config";

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
