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
- [ ] T1. Deps + scaffold Supabase CLI (`supabase/`) + clientes `supabase-js`/`@supabase/ssr`.
- [ ] T2. Migración SQL del schema (tablas uuid, enums, índices) → aplicada a remoto.
- [ ] T3. `profiles` + trigger de alta + Auth Hook de rol + RLS por tabla.
- [ ] T4. Funciones RPC: stock reservation, cancel, complete, rate-limit.
- [ ] T5. Capa de datos app: clientes + reescritura de los 8 repos + tipos generados.
- [ ] T6. Auth: signUp/signIn, sesión `@supabase/ssr`, proxy, baja de jose/argon2.
- [ ] T7. Storage para imágenes + baja de `imageBase64`.
- [ ] T8. Seed + env local + docs + baja de Prisma/docker-compose.
- [ ] T9. Verificación: typecheck + unit + e2e en verde.

## Evidencia (commits / checks)
- (pendiente)

## Notas / bloqueos
- Working tree llegó con MUCHOS archivos ya modificados sin commitear (pre-existente).
  Se trabaja en rama aparte; no se commitean cambios ajenos al feature sin tu OK.
- Docker apagado: local stack diferido.
