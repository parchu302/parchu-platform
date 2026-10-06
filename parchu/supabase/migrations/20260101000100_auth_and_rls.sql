-- ParchU — identidad, hook de rol y RLS.
-- Crea: trigger de alta de perfil, custom_access_token_hook (rol en el JWT),
-- helpers de autorización y políticas RLS por tabla.

-- ============================================================
-- 1. Alta de perfil al crear un usuario en Auth
-- ============================================================
-- IMPORTANTE: el rol NUNCA se toma de la metadata del usuario (evita que un
-- signup directo contra la API se autoasigne ADMIN). Siempre EMPRENDEDOR.
-- La promoción a ADMIN es out-of-band (SQL / service_role).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, "firstName", "lastName", role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'firstName', ''),
    nullif(new.raw_user_meta_data ->> 'lastName', ''),
    'EMPRENDEDOR'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 2. Custom Access Token Hook: inyecta el rol como claim `user_role`
-- ============================================================
-- Requiere habilitar el hook en Dashboard > Authentication > Hooks
-- (Custom Access Token) apuntando a public.custom_access_token_hook,
-- o en local vía config.toml ([auth.hook.custom_access_token]).
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
stable
as $$
declare
  claims jsonb;
  user_role public."Role";
begin
  select role into user_role from public.profiles where id = (event ->> 'user_id')::uuid;

  claims := event -> 'claims';
  if user_role is not null then
    claims := jsonb_set(claims, '{user_role}', to_jsonb(user_role::text));
  else
    claims := jsonb_set(claims, '{user_role}', 'null'::jsonb);
  end if;

  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- Permisos del hook: solo lo ejecuta el rol de Auth.
grant usage on schema public to supabase_auth_admin;
grant execute on function public.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function public.custom_access_token_hook(jsonb) from authenticated, anon, public;
grant select on public.profiles to supabase_auth_admin;

create policy "auth_admin_can_read_profiles"
  on public.profiles
  as permissive for select
  to supabase_auth_admin
  using (true);

-- ============================================================
-- 3. Helpers de autorización (SECURITY DEFINER = no recursan RLS)
-- ============================================================
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'ADMIN'
  );
$$;

create or replace function public.owns_business(business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    join public."Business" b on b."ownerId" = p.id
    where p.id = auth.uid() and b.id = business_id
  );
$$;

-- ============================================================
-- 4. Políticas RLS
-- ============================================================

-- ---------- profiles ----------
create policy "profiles_select_own_or_admin"
  on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());
-- Sin política de UPDATE/INSERT/DELETE para usuarios: perfiles se crean por el
-- trigger y se administran vía service_role. Previene autoescalada de rol.

-- ---------- Business ----------
create policy "business_select_public_catalog"
  on public."Business" for select to anon, authenticated
  using ("status" = 'APROBADO' and "deletedAt" is null);
create policy "business_select_own"
  on public."Business" for select to authenticated
  using ("ownerId" = auth.uid() or public.is_admin());
create policy "business_insert_own"
  on public."Business" for insert to authenticated
  with check ("ownerId" = auth.uid());
create policy "business_update_own_or_admin"
  on public."Business" for update to authenticated
  using ("ownerId" = auth.uid() or public.is_admin())
  with check ("ownerId" = auth.uid() or public.is_admin());

-- ---------- Product ----------
create policy "product_select_public_catalog"
  on public."Product" for select to anon, authenticated
  using (
    "status" = 'PUBLICADO' and exists (
      select 1 from public."Business" b
      where b.id = "Product"."businessId"
        and b."status" = 'APROBADO' and b."deletedAt" is null
    )
  );
create policy "product_select_own_or_admin"
  on public."Product" for select to authenticated
  using (public.owns_business("businessId") or public.is_admin());
create policy "product_write_own_or_admin"
  on public."Product" for all to authenticated
  using (public.owns_business("businessId") or public.is_admin())
  with check (public.owns_business("businessId") or public.is_admin());

-- ---------- PaymentMethod ----------
create policy "payment_select_for_approved_business"
  on public."PaymentMethod" for select to anon, authenticated
  using (
    exists (
      select 1 from public."Business" b
      where b.id = "PaymentMethod"."businessId"
        and b."status" = 'APROBADO' and b."deletedAt" is null
    )
  );
create policy "payment_select_own_or_admin"
  on public."PaymentMethod" for select to authenticated
  using (public.owns_business("businessId") or public.is_admin());
create policy "payment_write_own_or_admin"
  on public."PaymentMethod" for all to authenticated
  using (public.owns_business("businessId") or public.is_admin())
  with check (public.owns_business("businessId") or public.is_admin());

-- ---------- Order ----------
-- Creación de pedidos y seguimiento guest: vía RPC/service_role (bypassa RLS).
create policy "order_select_own_or_admin"
  on public."Order" for select to authenticated
  using (public.owns_business("businessId") or public.is_admin());
create policy "order_update_own_or_admin"
  on public."Order" for update to authenticated
  using (public.owns_business("businessId") or public.is_admin())
  with check (public.owns_business("businessId") or public.is_admin());

-- ---------- OrderItem ----------
create policy "orderitem_select_own_or_admin"
  on public."OrderItem" for select to authenticated
  using (
    exists (
      select 1 from public."Order" o
      where o.id = "OrderItem"."orderId"
        and (public.owns_business(o."businessId") or public.is_admin())
    )
  );

-- ---------- SellerLead ----------
create policy "sellerlead_insert_anon"
  on public."SellerLead" for insert to anon, authenticated
  with check (true);
create policy "sellerlead_select_admin"
  on public."SellerLead" for select to authenticated
  using (public.is_admin());

-- ---------- Notification ----------
create policy "notification_select_own_or_admin"
  on public."Notification" for select to authenticated
  using ("userId" = auth.uid() or public.is_admin());
create policy "notification_update_own"
  on public."Notification" for update to authenticated
  using ("userId" = auth.uid())
  with check ("userId" = auth.uid());

-- ---------- RateLimitAttempt ----------
-- Sin políticas: inaccesible para anon/authenticated. Solo RPC/service_role.
