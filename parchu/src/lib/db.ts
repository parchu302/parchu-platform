import { PrismaClient } from "@prisma/client";

// Singleton: en desarrollo el hot-reload de Next re-evalua los modulos y
// crearia una conexion nueva por recarga, agotando el pool de Postgres.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
