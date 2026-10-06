# Feature: Migración completa a Supabase (native)

**Rama de trabajo:** `feat/migracion-supabase`
**Alcance confirmado:** native completo (supabase-js + Supabase Auth + RLS + Storage),
Supabase CLI local, **sin migración de datos** (arranque limpio), PKs `uuid`.

**Proyecto Supabase:** `parchu` (ref `ngqleggzurgilmjqvrho`, org `vdimbwhnoyhinzharvyy`, Postgres 17).
Estado inicial: sin tablas `public`, sin migraciones, sin usuarios.

**Entorno:** Docker daemon apagado → desarrollo remote-first vía MCP; scaffold CLI listo
para local cuando Docker esté arriba.

## Decisiones de arquitectura
- PKs: `cuid` → `uuid DEFAULT gen_random_uuid()`.
- `profiles.id uuid` = `auth.users.id`; `Business.ownerId` y `Notification.userId` → `profiles.id`.
- Rol en custom claim del JWT vía Auth Hook (`role`), leído por RLS y proxy.
- Transacciones → funciones plpgsql `SECURITY DEFINER` invocadas por `rpc()`.
- Se retira: Prisma, `@node-rs/argon2`, `jose` (session JWE), `docker-compose` Postgres.
- Se conserva: crypto de código de confirmación (AES-256-GCM) y tracking token.

## Tareas
- [x] T1. Deps + scaffold Supabase CLI (`supabase/`) + clientes `supabase-js`/`@supabase/ssr`.
- [x] T2. Migración SQL del schema (tablas uuid, enums, índices) → aplicada a remoto.
- [x] T3. `profiles` + trigger de alta + Auth Hook de rol + RLS por tabla.
- [x] T4. Funciones RPC: stock reservation, cancel, complete, rate-limit.
- [~] T5. Capa de datos app: clientes [x] + tipos generados [x] + helper money [x] +
        reescritura de los 8 repos [ ] (BLOQUEADO: service-role key + verificación).
- [ ] T6. Auth: signUp/signIn, sesión `@supabase/ssr`, proxy, baja de jose/argon2.
- [ ] T7. Storage para imágenes + baja de `imageBase64`.
- [ ] T8. Seed + env local + docs + baja de Prisma/docker-compose.
- [ ] T9. Verificación: typecheck + unit + e2e en verde.

## Evidencia (commits / checks)
- 3e43352 T1 scaffold + clientes + deps.
- 1ea63f6 T2 schema (aplicado a remoto, 9 tablas verificadas).
- babb91b T3 auth hook + trigger + RLS + hardening (advisor: solo warnings aceptables).
- a3317a4 T4 RPC transacciones (rate-limit smoke-tested 1→2→3).
- 104ca51 T5 parcial: database.types.ts + types.ts + money.ts.

## Notas / bloqueos
- Working tree llegó con 161 archivos "modificados": son SOLO diferencias CRLF/LF
  (verificado con `git diff --ignore-cr-at-eol`), no trabajo ajeno. Se commitea solo
  lo que toco para el feature.
- WSL sobre /mnt/c: `npm install` requiere `--no-bin-links`; `git config` no escribe
  (.git/config EPERM) → identidad inline en cada commit; no hay `.bin/` para binarios.
- Docker daemon APAGADO: `supabase start` local diferido.
- **BLOQUEO de verificación (solo el usuario puede resolver):**
  1. `SUPABASE_SERVICE_ROLE_KEY` (secreta, Dashboard > Settings > API) — necesaria para
     el cliente admin, el seed y correr app/tests. No recuperable por MCP.
  2. Docker encendido (para `supabase start` local) o uso del remoto con la key.
  3. Habilitar el Custom Access Token hook en Dashboard > Authentication > Hooks
     apuntando a `public.custom_access_token_hook`.
  4. Baseline roto en este entorno: el cliente Prisma no está generado y falta
     `next typegen`, así que hoy el proyecto no tipa-chequea aquí.
- Decisión de cliente en repos: usan el cliente **service-role** (server-only, tras
  requireRole), con RLS como defensa en profundidad para anon/browser. Pendiente de aplicar.
