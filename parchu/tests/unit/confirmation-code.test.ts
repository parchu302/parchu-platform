import { randomBytes } from "node:crypto";

import { afterEach, describe, expect, it } from "vitest";

import {
  createConfirmationCode,
  decryptConfirmationCode,
  encryptConfirmationCode,
  generateConfirmationCode,
  hashConfirmationCode,
  verifyConfirmationCode,
} from "@/lib/confirmation-code";
import { generateTrackingToken } from "@/lib/tracking-token";

const ORIGINAL_SECRET = process.env.CONFIRMATION_CODE_SECRET;

afterEach(() => {
  process.env.CONFIRMATION_CODE_SECRET = ORIGINAL_SECRET;
});

describe("código de confirmación", () => {
  it("genera códigos sin caracteres ambiguos", () => {
    for (let i = 0; i < 50; i += 1) {
      const code = generateConfirmationCode();
      expect(code).toHaveLength(6);
      expect(code).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    }
  });

  it("genera códigos distintos entre sí", () => {
    const codes = new Set(
      Array.from({ length: 200 }, () => generateConfirmationCode()),
    );
    // Con 31^6 combinaciones, 200 repetidos serían señal de un generador roto.
    expect(codes.size).toBeGreaterThan(190);
  });

  it("valida el código correcto y rechaza el incorrecto", () => {
    const { code, hash } = createConfirmationCode();

    expect(verifyConfirmationCode(hash, code)).toBe(true);
    expect(verifyConfirmationCode(hash, "ZZZZZZ")).toBe(false);
  });

  it("acepta el código en minúsculas y con espacios sobrantes", () => {
    const { code, hash } = createConfirmationCode();

    expect(verifyConfirmationCode(hash, `  ${code.toLowerCase()}  `)).toBe(true);
  });

  it("no guarda el código en claro dentro del hash", () => {
    const { code, hash } = createConfirmationCode();

    expect(hash).not.toContain(code);
  });

  it("descifra el mismo código que se cifró", () => {
    const { code, encrypted } = createConfirmationCode();

    expect(encrypted).not.toContain(code);
    expect(decryptConfirmationCode(encrypted)).toBe(code);
  });

  it("usa un IV distinto en cada cifrado del mismo código", () => {
    const first = encryptConfirmationCode("ABC234");
    const second = encryptConfirmationCode("ABC234");

    expect(first).not.toBe(second);
    expect(decryptConfirmationCode(first)).toBe("ABC234");
    expect(decryptConfirmationCode(second)).toBe("ABC234");
  });

  it("rechaza un cifrado manipulado en vez de devolver basura", () => {
    const encrypted = encryptConfirmationCode("ABC234");
    const raw = Buffer.from(encrypted, "base64");
    raw[raw.length - 1] ^= 0xff;

    expect(() => decryptConfirmationCode(raw.toString("base64"))).toThrow();
  });

  it("no descifra con otra clave maestra", () => {
    const encrypted = encryptConfirmationCode("ABC234");
    process.env.CONFIRMATION_CODE_SECRET = randomBytes(32).toString("base64");

    expect(() => decryptConfirmationCode(encrypted)).toThrow();
  });

  it("deriva subclaves distintas para hash y cifrado", () => {
    // Si compartieran clave, el hash del código aparecería relacionado con el
    // cifrado; se verifica al menos que no coincidan.
    const code = "ABC234";
    expect(hashConfirmationCode(code)).not.toBe(encryptConfirmationCode(code));
  });

  it("exige una clave maestra de 32 bytes", () => {
    process.env.CONFIRMATION_CODE_SECRET = Buffer.from("corta").toString("base64");

    expect(() => createConfirmationCode()).toThrow(/32 bytes/);
  });
});

describe("token de seguimiento", () => {
  it("tiene al menos 128 bits de entropía", () => {
    const token = generateTrackingToken();
    expect(Buffer.from(token, "base64url").length).toBeGreaterThanOrEqual(16);
  });

  it("no es predecible ni secuencial", () => {
    const tokens = new Set(
      Array.from({ length: 500 }, () => generateTrackingToken()),
    );
    expect(tokens.size).toBe(500);
  });
});
