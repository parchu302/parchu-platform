import { EncryptJWT, jwtDecrypt } from "jose";

import type { Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "parchu_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8; // 8 horas

export type SessionPayload = {
  userId: string;
  role: Role;
};

// Se lee en cada llamada (no al cargar el modulo) para que el entorno de
// pruebas pueda definir la variable despues del import.
function getSessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET no esta definido");
  }

  const key = Buffer.from(secret, "base64");
  if (key.length !== 32) {
    throw new Error(
      "SESSION_SECRET debe ser una clave de 32 bytes en base64 (openssl rand -base64 32)",
    );
  }

  return new Uint8Array(key);
}

function isRole(value: unknown): value is Role {
  return value === "EMPRENDEDOR" || value === "ADMIN";
}

// JWE (cifrado, no solo firmado): el contenido de la sesion tampoco es
// legible desde el token, no solo inalterable.
export async function encryptSession(payload: SessionPayload): Promise<string> {
  return new EncryptJWT({ userId: payload.userId, role: payload.role })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .encrypt(getSessionKey());
}

// Devuelve null ante cualquier fallo (token alterado, expirado, ausente o
// con forma inesperada): nunca lanza hacia la capa que decide el acceso.
export async function decryptSession(
  token: string | undefined | null,
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtDecrypt(token, getSessionKey());

    if (typeof payload.userId !== "string" || !isRole(payload.role)) {
      return null;
    }

    return { userId: payload.userId, role: payload.role };
  } catch {
    return null;
  }
}
