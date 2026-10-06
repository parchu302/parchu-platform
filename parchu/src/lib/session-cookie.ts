import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

// La sesión la administra Supabase Auth (cookies gestionadas por @supabase/ssr).
// Este módulo expone la lectura de sesión y el cierre, manteniendo la forma
// { userId, role } que ya consumen auth-guard y las páginas/acciones.

export type SessionPayload = {
  userId: string;
  role: Role;
};

// getUser() valida el JWT contra el servidor de Auth (no confía en la cookie
// sin verificar). El rol se lee de profiles: la política RLS permite al usuario
// ver su propia fila, y así no dependemos de que el Auth Hook esté habilitado.
export async function getSession(): Promise<SessionPayload | null> {
  const sb = await createClient();

  const {
    data: { user },
    error,
  } = await sb.auth.getUser();

  if (error || !user) return null;

  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) return null;

  return { userId: user.id, role: profile.role };
}

export async function destroySessionCookie(): Promise<void> {
  const sb = await createClient();
  await sb.auth.signOut();
}
