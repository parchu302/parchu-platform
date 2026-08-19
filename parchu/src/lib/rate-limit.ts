import { randomUUID } from "node:crypto";

import { db } from "@/lib/db";

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

// Contador de ventana fija en Postgres. Se elige por sobre un store en
// memoria porque el proxy/las Server Actions corren en funciones serverless
// sin estado compartido entre invocaciones: en Vercel, contar en memoria de
// proceso no detectaria nada. Se reutiliza la base ya provista para el
// despliegue en vez de sumar un servicio nuevo (Redis u otro).
//
// El incremento es atomico via INSERT ... ON CONFLICT (mismo patron que la
// reserva de stock de la Fase 5): dos llamadas concurrentes con la misma
// clave no pueden pisarse el conteo entre si.
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const windowStart = new Date(
    Math.floor(Date.now() / options.windowMs) * options.windowMs,
  );

  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimitAttempt" ("id", "key", "windowStart", "count")
    VALUES (${randomUUID()}, ${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart")
    DO UPDATE SET "count" = "RateLimitAttempt"."count" + 1
    RETURNING "count"
  `;

  const count = rows[0]?.count ?? 1;

  // Limpieza oportunista: borra ventanas vencidas de esta misma clave para
  // que la tabla no crezca sin limite. No hace falta un job aparte.
  await db.rateLimitAttempt.deleteMany({
    where: {
      key,
      windowStart: { lt: new Date(windowStart.getTime() - options.windowMs) },
    },
  });

  return {
    allowed: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
    retryAfterMs: windowStart.getTime() + options.windowMs - Date.now(),
  };
}
