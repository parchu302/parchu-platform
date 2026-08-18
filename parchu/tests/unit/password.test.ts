import { describe, expect, it } from "vitest";

import { hashPassword, verifyPassword } from "@/lib/password";

describe("password", () => {
  it("genera un hash argon2id y lo verifica", async () => {
    const hash = await hashPassword("ClaveSegura1");

    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "ClaveSegura1")).toBe(true);
  });

  it("rechaza una contrasena incorrecta", async () => {
    const hash = await hashPassword("ClaveSegura1");

    expect(await verifyPassword(hash, "ClaveSegura2")).toBe(false);
  });

  it("nunca deja la contrasena en claro dentro del hash", async () => {
    const hash = await hashPassword("ClaveSegura1");

    expect(hash).not.toContain("ClaveSegura1");
  });

  it("usa sal distinta en cada hash de la misma contrasena", async () => {
    const [first, second] = await Promise.all([
      hashPassword("ClaveSegura1"),
      hashPassword("ClaveSegura1"),
    ]);

    expect(first).not.toBe(second);
    expect(await verifyPassword(first, "ClaveSegura1")).toBe(true);
    expect(await verifyPassword(second, "ClaveSegura1")).toBe(true);
  });

  it("devuelve false ante un hash malformado en vez de lanzar", async () => {
    expect(await verifyPassword("no-es-un-hash", "ClaveSegura1")).toBe(false);
  });
});
