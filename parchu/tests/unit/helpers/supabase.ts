import { createAdminClient } from "@/lib/supabase/admin";

// Helpers compartidos por los tests unitarios contra el Supabase local.
// Preparan/limpian datos con el cliente admin (service-role, salta RLS).

export const sb = createAdminClient();

export function must<T>(result: { data: T | null; error: unknown }): T {
  if (result.error) throw result.error;
  if (result.data === null) throw new Error("consulta sin datos");
  return result.data;
}

export async function createTestUser(
  email: string,
  opts: { firstName?: string; lastName?: string; role?: "ADMIN" | "EMPRENDEDOR" } = {},
): Promise<string> {
  const { data, error } = await sb.auth.admin.createUser({
    email,
    password: "ClaveSegura1",
    email_confirm: true,
    user_metadata: {
      firstName: opts.firstName ?? "Ana",
      lastName: opts.lastName ?? "Test",
    },
  });
  if (error || !data.user) throw error ?? new Error("no se creó el usuario");
  if (opts.role && opts.role !== "EMPRENDEDOR") {
    const upd = await sb
      .from("profiles")
      .update({ role: opts.role })
      .eq("id", data.user.id);
    if (upd.error) throw upd.error;
  }
  return data.user.id;
}

// Borra los usuarios de auth cuyo email contiene `marker` (profiles cae en
// cascada). Los dependientes (negocios, pedidos...) deben borrarse antes.
export async function deleteTestUsers(marker: string): Promise<void> {
  const { data } = await sb
    .from("profiles")
    .select("id")
    .like("email", `%${marker}%`);
  for (const row of data ?? []) {
    await sb.auth.admin.deleteUser(row.id);
  }
}

// IDs de negocios cuyo nombre contiene `marker`.
export async function businessIds(marker: string): Promise<string[]> {
  const { data } = await sb.from("Business").select("id").like("name", `%${marker}%`);
  return (data ?? []).map((r) => r.id);
}
