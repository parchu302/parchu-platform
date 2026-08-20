import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import {
  MAX_IMAGE_DATA_URL_LENGTH,
  isValidProductImage,
  parseImageDataUrl,
} from "@/lib/image";

const REAL_PNG_BASE64 = readFileSync(
  path.join(process.cwd(), "tests/fixtures/product-image.png"),
).toString("base64");

function jpegDataUrl(bodyLength = 32): string {
  const buffer = Buffer.concat([
    Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    Buffer.alloc(bodyLength),
  ]);
  return `data:image/jpeg;base64,${buffer.toString("base64")}`;
}

function webpDataUrl(): string {
  const buffer = Buffer.concat([
    Buffer.from("RIFF", "ascii"),
    Buffer.from([0x00, 0x00, 0x00, 0x00]),
    Buffer.from("WEBP", "ascii"),
    Buffer.alloc(16),
  ]);
  return `data:image/webp;base64,${buffer.toString("base64")}`;
}

describe("isValidProductImage", () => {
  it("acepta un PNG real con su firma correcta", () => {
    expect(isValidProductImage(`data:image/png;base64,${REAL_PNG_BASE64}`)).toBe(
      true,
    );
  });

  it("acepta un JPEG con la firma FF D8 FF", () => {
    expect(isValidProductImage(jpegDataUrl())).toBe(true);
  });

  it("acepta un WEBP con la firma RIFF....WEBP", () => {
    expect(isValidProductImage(webpDataUrl())).toBe(true);
  });

  it("rechaza una cadena vacía", () => {
    expect(isValidProductImage("")).toBe(false);
  });

  it("rechaza un valor sin prefijo de data URL", () => {
    expect(isValidProductImage(REAL_PNG_BASE64)).toBe(false);
  });

  it("rechaza un mimetype no soportado", () => {
    const gifSignature = Buffer.from("GIF89a", "ascii").toString("base64");
    expect(isValidProductImage(`data:image/gif;base64,${gifSignature}`)).toBe(
      false,
    );
  });

  it("rechaza cuando el mimetype declarado no coincide con la firma real", () => {
    // Se declara PNG pero los bytes decodificados son los de un JPEG.
    const jpegBytes = Buffer.from([0xff, 0xd8, 0xff, 0xe0]).toString("base64");
    expect(isValidProductImage(`data:image/png;base64,${jpegBytes}`)).toBe(
      false,
    );
  });

  it("rechaza un data URL que excede el tamaño máximo permitido", () => {
    const oversized = `data:image/jpeg;base64,${"A".repeat(
      MAX_IMAGE_DATA_URL_LENGTH,
    )}`;
    expect(isValidProductImage(oversized)).toBe(false);
  });
});

describe("parseImageDataUrl", () => {
  it("extrae el mimetype y el cuerpo en base64", () => {
    const parsed = parseImageDataUrl(`data:image/png;base64,${REAL_PNG_BASE64}`);
    expect(parsed).toEqual({ mime: "image/png", base64: REAL_PNG_BASE64 });
  });

  it("devuelve null para un valor que no es un data URL", () => {
    expect(parseImageDataUrl("no-es-un-data-url")).toBeNull();
  });
});
