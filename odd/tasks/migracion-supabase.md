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

## Requerimiento nuevo (usuario): verificación de correo OBLIGATORIA
- NO se desactiva "Confirm email". El registro exige confirmar el correo.
- Implementado (commit 55303c5): signUp con emailRedirectTo; ruta /auth/confirm
  (verifyOtp); registro muestra "revisá tu correo"; login distingue correo no
  confirmado; config local enable_confirmations=true + template + Inbucket.
- ACCIÓN USUARIO en Dashboard remoto (para prod):
  1. Authentication > URL Configuration: Site URL = URL del deploy; Redirect URLs
     debe incluir `<site>/auth/confirm`.
  2. Authentication > Emails > template "Confirm signup": el enlace debe apuntar a
     `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.
  3. Configurar SMTP (en prod) para que los correos salgan; en local usa Inbucket.

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
- 104ca51 T5 base: database.types.ts + types.ts + money.ts.
- 11aa8ea RPC catalogo (count/find/list public products).
- 745ad34 T5 capa de datos no-auth -> supabase-js (typecheck limpio en migrados).
- 151b5b2 T6 auth -> Supabase Auth (ssr, proxy); eliminados db/session/password/user-repo.
- VERIFICACION: smoke test funcional DB OK (orden/stock/rate-limit/rol/hook);
  typecheck de src/ = 0 errores tras `next typegen`. CERO @prisma/client en src/.
- PENDIENTE: prisma/seed.ts + ~19 tests (Prisma/argon2); docs/deps cleanup;
  Storage imagenes (diferido); verificacion runtime de embeds/flujos (Docker/next build).
- ACCION USUARIO (Dashboard remoto): poner "Confirm email" OFF (si no, el registro
  no auto-loguea y no hay SMTP). Auth Hook opcional.

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
