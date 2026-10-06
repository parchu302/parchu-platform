-- Endurecimiento de funciones (advisories de seguridad Supabase).

-- Hook: fijar search_path inmutable.
alter function public.custom_access_token_hook(jsonb) set search_path = '';

-- handle_new_user es función de trigger: no debe ser invocable por RPC.
-- Los triggers no requieren EXECUTE del rol que dispara el DML.
revoke execute on function public.handle_new_user() from anon, authenticated, public;

-- Helpers de RLS: solo authenticated los necesita (las policies anon no los usan).
revoke execute on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

revoke execute on function public.owns_business(uuid) from public, anon;
grant execute on function public.owns_business(uuid) to authenticated;

-- Nota: RateLimitAttempt mantiene RLS on sin policies a propósito
-- (solo accesible por RPC SECURITY DEFINER / service_role).
comment on table public."RateLimitAttempt" is
  'RLS on sin policies por diseño: acceso solo vía RPC/service_role.';
