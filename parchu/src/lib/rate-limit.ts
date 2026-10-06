import { createAdminClient } from "@/lib/supabase/admin";

export type RateLimitOptions = {
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  retryAfterMs: number;
};

// Contador de ventana fija en Postgres. Se elige por sobre un store en
// memoria porque el proxy/las Server Actions corren en funciones serverless
// sin estado compartido entre invocaciones: en Vercel, contar en memoria de
// proceso no detectaria nada. Se reutiliza la base ya provista para el
// despliegue en vez de sumar un servicio nuevo (Redis u otro).
//
// El incremento es atomico via INSERT ... ON CONFLICT (mismo patron que la
// reserva de stock de la Fase 5): dos llamadas concurrentes con la misma
// clave no pueden pisarse el conteo entre si.
export async function checkRateLimit(
  key: string,
  options: RateLimitOptions,
): Promise<RateLimitResult> {
  const windowStart = new Date(
    Math.floor(Date.now() / options.windowMs) * options.windowMs,
  );

  // Incremento atomico (INSERT ... ON CONFLICT) y limpieza oportunista de
  // ventanas vencidas de esta misma clave, ambos dentro de la RPC.
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("increment_rate_limit", {
    p_key: key,
    p_window_start: windowStart.toISOString(),
    p_cutoff: new Date(windowStart.getTime() - options.windowMs).toISOString(),
  });
  if (error) throw error;

  const count = data ?? 1;

  return {
    allowed: count <= options.limit,
    remaining: Math.max(0, options.limit - count),
    retryAfterMs: windowStart.getTime() + options.windowMs - Date.now(),
  };
}
