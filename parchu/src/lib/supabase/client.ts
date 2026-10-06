import { createBrowserClient } from "@supabase/ssr";

// Cliente para componentes del navegador. Usa la clave publishable (anon):
// respeta RLS. Nunca debe usar la service-role key.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
