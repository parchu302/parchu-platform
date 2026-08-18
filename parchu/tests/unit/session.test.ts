import { randomBytes } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import { decryptSession, encryptSession } from "@/lib/session";

import { tamperJweToken } from "../steps/tamper";

const ORIGINAL_SECRET = process.env.SESSION_SECRET;

afterEach(() => {
  process.env.SESSION_SECRET = ORIGINAL_SECRET;
});

describe("session", () => {
  it("cifra y descifra la sesion conservando userId y rol", async () => {
    const token = await encryptSession({ userId: "user_1", role: "ADMIN" });

    expect(token).not.toContain("user_1");
    expect(await decryptSession(token)).toEqual({
      userId: "user_1",
      role: "ADMIN",
    });
  });

  it("rechaza un token alterado", async () => {
    const token = await encryptSession({
      userId: "user_1",
      role: "EMPRENDEDOR",
    });

    const tampered = tamperJweToken(token);

    expect(await decryptSession(tampered)).toBeNull();
  });

  it("rechaza un token cifrado con otra clave", async () => {
    const token = await encryptSession({
      userId: "user_1",
      role: "EMPRENDEDOR",
    });

    process.env.SESSION_SECRET = randomBytes(32).toString("base64");

    expect(await decryptSession(token)).toBeNull();
  });

  it("devuelve null cuando no hay cookie", async () => {
    expect(await decryptSession(undefined)).toBeNull();
    expect(await decryptSession(null)).toBeNull();
    expect(await decryptSession("")).toBeNull();
  });

  it("rechaza una clave que no tenga 32 bytes", async () => {
    process.env.SESSION_SECRET = Buffer.from("corta").toString("base64");

    await expect(
      encryptSession({ userId: "user_1", role: "ADMIN" }),
    ).rejects.toThrow(/32 bytes/);
  });
});
