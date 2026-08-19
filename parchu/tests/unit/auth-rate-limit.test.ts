import { describe, expect, it } from "vitest";

import { checkRateLimit } from "@/lib/rate-limit";

// La integracion completa se prueba en el nivel del rate limiter (ya cubierto
// exhaustivamente en rate-limit.test.ts). Aqui se verifica que las claves y
// limites que usan las acciones de auth son coherentes: distintos correos no
// se pisan entre si, y el limite se respeta con la misma configuracion que
// loginAction usa en produccion.
const EMAIL_LIMIT = { limit: 5, windowMs: 5 * 60_000 };

describe("rate limit de login (integración de claves)", () => {
  it("bloquea el sexto intento sobre el mismo correo", async () => {
    const key = `login:email:rate-limit-test-${Date.now()}@uni.edu`;

    const results = [];
    for (let i = 0; i < 6; i += 1) {
      results.push(await checkRateLimit(key, EMAIL_LIMIT));
    }

    expect(results.filter((r) => r.allowed)).toHaveLength(5);
    expect(results.at(-1)?.allowed).toBe(false);
  });

  it("no bloquea intentos sobre un correo distinto", async () => {
    const blockedEmail = `login:email:bloqueado-${Date.now()}@uni.edu`;
    const freshEmail = `login:email:fresco-${Date.now()}@uni.edu`;

    for (let i = 0; i < 6; i += 1) {
      await checkRateLimit(blockedEmail, EMAIL_LIMIT);
    }

    expect((await checkRateLimit(freshEmail, EMAIL_LIMIT)).allowed).toBe(true);
  });
});
