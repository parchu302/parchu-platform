import { redirect } from "next/navigation";

import { getSession, type SessionPayload } from "@/lib/session-cookie";
import type { Role } from "@/lib/types";

export type { SessionPayload };

export function homePathForRole(role: Role): string {
  return role === "ADMIN" ? "/admin" : "/panel";
}

export async function requireSession(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

// Autorizacion real. El proxy solo hace un chequeo optimista sobre la sesion;
// los docs de Next advierten que no debe ser la unica capa.
export async function requireRole(role: Role): Promise<SessionPayload> {
  const session = await requireSession();

  if (session.role !== role) {
    redirect(homePathForRole(session.role));
  }

  return session;
}
