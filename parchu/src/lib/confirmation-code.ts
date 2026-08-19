import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  hkdfSync,
  randomBytes,
  randomInt,
  timingSafeEqual,
} from "node:crypto";

// Alfabeto sin caracteres ambiguos (0/O, 1/I/L): el emprendedor teclea este
// código dictado por el cliente.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;

const IV_BYTES = 12; // recomendado para AES-GCM
const TAG_BYTES = 16;

function masterKey(): Buffer {
  const secret = process.env.CONFIRMATION_CODE_SECRET;
  if (!secret) {
    throw new Error("CONFIRMATION_CODE_SECRET no esta definido");
  }

  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) {
    throw new Error(
      "CONFIRMATION_CODE_SECRET debe ser una clave de 32 bytes en base64 (openssl rand -base64 32)",
    );
  }

  return key;
}

// Nunca se usa la misma clave para dos propositos: se derivan dos subclaves
// independientes del secreto maestro.
function derivedKey(purpose: "encryption" | "hmac"): Buffer {
  return Buffer.from(
    hkdfSync("sha256", masterKey(), "parchu-confirmation", purpose, 32),
  );
}

export function generateConfirmationCode(): string {
  let code = "";
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    // randomInt usa el generador criptografico, no Math.random.
    code += ALPHABET[randomInt(ALPHABET.length)];
  }
  return code;
}

export function hashConfirmationCode(code: string): string {
  return createHmac("sha256", derivedKey("hmac"))
    .update(code.trim().toUpperCase())
    .digest("base64");
}

// Comparacion en tiempo constante: el tiempo de respuesta no revela cuantos
// caracteres del codigo eran correctos.
export function verifyConfirmationCode(
  storedHash: string,
  candidate: string,
): boolean {
  const expected = Buffer.from(storedHash, "base64");
  const actual = Buffer.from(hashConfirmationCode(candidate), "base64");

  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

// Cifrado reversible: el cliente debe poder consultar su codigo en la pagina
// de seguimiento, incluso despues de que el administrador lo regenere. El
// codigo nunca se persiste en claro.
export function encryptConfirmationCode(code: string): string {
  // IV aleatorio y distinto en cada cifrado: reutilizarlo con la misma clave
  // rompe por completo la seguridad de GCM.
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", derivedKey("encryption"), iv);
  const ciphertext = Buffer.concat([
    cipher.update(code, "utf8"),
    cipher.final(),
  ]);

  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString(
    "base64",
  );
}

export function decryptConfirmationCode(encrypted: string): string {
  const raw = Buffer.from(encrypted, "base64");

  const iv = raw.subarray(0, IV_BYTES);
  const tag = raw.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
  const ciphertext = raw.subarray(IV_BYTES + TAG_BYTES);

  const decipher = createDecipheriv("aes-256-gcm", derivedKey("encryption"), iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export type ConfirmationCodeMaterial = {
  code: string;
  hash: string;
  encrypted: string;
};

// Hash y cifrado se producen SIEMPRE juntos, a partir del mismo codigo: si se
// generaran por separado podrian acabar representando codigos distintos.
export function createConfirmationCode(): ConfirmationCodeMaterial {
  const code = generateConfirmationCode();

  return {
    code,
    hash: hashConfirmationCode(code),
    encrypted: encryptConfirmationCode(code),
  };
}
