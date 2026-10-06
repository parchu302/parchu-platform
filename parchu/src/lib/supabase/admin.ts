import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Cliente de servicio: usa la service-role key y SALTA RLS. Úsese SOLO en
// código de servidor de confianza (servicios/repositorios que ya validaron
// autorización vía requireRole/requireSession), nunca en el navegador y nunca
// expuesto al cliente. No persiste sesión.
//
// Se crea por invocación (no singleton con cookies) porque no está ligado a
// una request; es seguro cachearlo a nivel de módulo.
let adminClient: ReturnType<typeof createSupabaseClient> | null = null;

export function createAdminClient() {
  if (adminClient) return adminClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY para el cliente admin",
    );
  }

  adminClient = createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return adminClient;
}
