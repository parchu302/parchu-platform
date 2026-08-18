import { redirect } from "next/navigation";

import type { Role } from "@prisma/client";

import type { SessionPayload } from "@/lib/session";
import { getSession } from "@/lib/session-cookie";

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

// Autorizacion real. El proxy solo hace un chequeo optimista sobre la cookie;
// los docs de Next advierten explicitamente que no debe ser la unica capa,
// entre otras cosas porque un cambio de matcher puede dejar rutas sin cubrir.
export async function requireRole(role: Role): Promise<SessionPayload> {
  const session = await requireSession();

  if (session.role !== role) {
    redirect(homePathForRole(session.role));
  }

  return session;
}
