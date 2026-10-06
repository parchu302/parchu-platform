import { createClient as createSupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/supabase/database.types";

// Cliente de lectura pública: usa la clave anon (publishable) y RESPETA RLS.
// No persiste sesión y NO depende de cookies, así que funciona también en el
// prerender estático/ISR (donde no hay contexto de request). Es el cliente para
// el catálogo público, cuya visibilidad ya está garantizada por RLS + las RPC
// SECURITY DEFINER otorgadas a anon. NO requiere el secreto service-role, por lo
// que el build solo necesita las variables NEXT_PUBLIC_* (no secretas).
//
// Se cachea a nivel de módulo: no está ligado a una request.
let publicClient: ReturnType<typeof createSupabaseClient<Database>> | null = null;

export function createPublicClient() {
  if (publicClient) return publicClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY para el cliente público",
    );
  }

  publicClient = createSupabaseClient<Database>(url, anonKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  return publicClient;
}
