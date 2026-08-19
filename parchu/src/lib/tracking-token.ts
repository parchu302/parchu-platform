import { randomBytes } from "node:crypto";

// 32 bytes = 256 bits de entropia: el enlace de seguimiento es la unica
// credencial del cliente invitado, asi que no debe ser adivinable ni
// enumerable.
const TOKEN_BYTES = 32;

export function generateTrackingToken(): string {
  return randomBytes(TOKEN_BYTES).toString("base64url");
}
