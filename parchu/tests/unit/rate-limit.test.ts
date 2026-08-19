import { afterEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

const MARKER = "ratelimit-test";

afterEach(async () => {
  await db.rateLimitAttempt.deleteMany({ where: { key: { contains: MARKER } } });
});

describe("checkRateLimit", () => {
  it("permite hasta el limite y rechaza el siguiente", async () => {
    const key = `${MARKER}:basico:${Date.now()}`;
    const options = { limit: 3, windowMs: 60_000 };

    const results = [];
    for (let i = 0; i < 4; i += 1) {
      results.push(await checkRateLimit(key, options));
    }

    expect(results.map((r) => r.allowed)).toEqual([true, true, true, false]);
    expect(results[3]?.remaining).toBe(0);
  });

  it("cuenta claves distintas por separado", async () => {
    const options = { limit: 1, windowMs: 60_000 };

    const a = await checkRateLimit(`${MARKER}:a:${Date.now()}`, options);
    const b = await checkRateLimit(`${MARKER}:b:${Date.now()}`, options);

    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true);
  });

  it("con muchas llamadas concurrentes, deja pasar exactamente el limite", async () => {
    const key = `${MARKER}:concurrencia:${Date.now()}`;
    const options = { limit: 5, windowMs: 60_000 };

    const results = await Promise.all(
      Array.from({ length: 20 }, () => checkRateLimit(key, options)),
    );

    expect(results.filter((r) => r.allowed)).toHaveLength(5);
  });

  it("reinicia el conteo en una ventana nueva", async () => {
    const key = `${MARKER}:ventana:${Date.now()}`;

    // Ventana de 1ms: la siguiente llamada, un instante despues, cae en otra
    // ventana y no deberia arrastrar el conteo de la anterior.
    const first = await checkRateLimit(key, { limit: 1, windowMs: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await checkRateLimit(key, { limit: 1, windowMs: 1 });

    expect(first.allowed).toBe(true);
    expect(second.allowed).toBe(true);
  });

  it("limpia ventanas vencidas de la misma clave", async () => {
    const key = `${MARKER}:limpieza:${Date.now()}`;

    await checkRateLimit(key, { limit: 5, windowMs: 1 });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await checkRateLimit(key, { limit: 5, windowMs: 1 });

    const remaining = await db.rateLimitAttempt.count({ where: { key } });
    // Solo debe quedar la ventana vigente, no la vieja.
    expect(remaining).toBe(1);
  });

  it("informa un retryAfterMs positivo cuando se excede el limite", async () => {
    const key = `${MARKER}:retry:${Date.now()}`;
    const options = { limit: 1, windowMs: 60_000 };

    await checkRateLimit(key, options);
    const blocked = await checkRateLimit(key, options);

    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
    expect(blocked.retryAfterMs).toBeLessThanOrEqual(options.windowMs);
  });
});
