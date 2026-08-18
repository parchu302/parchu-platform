import { hash, verify, type Options } from "@node-rs/argon2";

// @node-rs/argon2 exporta `Algorithm` como const enum ambiente, que no puede
// importarse con isolatedModules (obligatorio en Next). Se usa el valor
// literal del enum (Argon2d = 0, Argon2i = 1, Argon2id = 2).
// El test de password verifica que el hash resultante empiece por
// "$argon2id$", asi que un cambio de esos valores se detecta de inmediato.
const ARGON2ID = 2;

// Parametros recomendados por OWASP para argon2id.
const ARGON2_OPTIONS: Options = {
  algorithm: ARGON2ID,
  memoryCost: 19456, // 19 MiB
  timeCost: 2,
  parallelism: 1,
};

export async function hashPassword(plainPassword: string): Promise<string> {
  return hash(plainPassword, ARGON2_OPTIONS);
}

export async function verifyPassword(
  passwordHash: string,
  plainPassword: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, plainPassword, ARGON2_OPTIONS);
  } catch {
    // Hash corrupto o con formato desconocido: se trata como no coincidente
    // en vez de propagar el error (no revela nada al llamador).
    return false;
  }
}
