import { cookies } from "next/headers";

import { createServerClient } from "@supabase/ssr";

// Cliente del servidor ligado a las cookies de la request (sesión del usuario).
// Usa la clave anon: RESPETA RLS. Es el cliente por defecto para Server
// Components, Server Actions y proxy. Para operaciones de confianza que deben
// saltarse RLS, usar createAdminClient() (admin.ts).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          // En Server Components el set de cookies puede lanzar; se ignora
          // porque el refresh de sesión lo maneja el proxy. En Server Actions
          // y Route Handlers sí persiste.
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // noop: contexto de solo lectura (Server Component).
          }
        },
      },
    },
  );
}
