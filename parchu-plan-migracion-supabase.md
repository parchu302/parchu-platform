# Plan de migración a Supabase (native completo)

> Objetivo del usuario: migrar ParchU de **PostgreSQL (Render) + Prisma + auth propia**
> a **Supabase completo**, sin errores.
>
> Decisiones tomadas:
> - **Alcance:** Supabase-native completo → `supabase-js` en vez de Prisma, Supabase Auth
>   en vez de `argon2 + jose`, y **RLS** por tabla.
> - **Entorno local:** Supabase CLI (Docker), reemplazando el `docker-compose` de Postgres.
> - **Datos:** migrar datos reales desde Render (dump/restore + verificación).

---

## 0. Estado actual (lo que descubrimos explorando)

| Pieza | Hoy | Archivo(s) |
| --- | --- | --- |
| Conexión DB | `PrismaClient` singleton | `src/lib/db.ts` |
| Modelo de datos | Prisma schema, 8 modelos, IDs `cuid()`, enums, `Decimal(12,2)` | `prisma/schema.prisma` |
| Acceso a datos | Patrón repositorio limpio (8 repos) | `src/repositories/*` |
| Transacciones | `db.$transaction` + raw SQL (`UPDATE ... WHERE stock >=`) | `order-repository.ts` |
| Rate limit | `INSERT ... ON CONFLICT` atómico en Postgres | `src/lib/rate-limit.ts` |
| Auth — passwords | `@node-rs/argon2` (argon2id, params OWASP) | `src/lib/password.ts` |
| Auth — sesión | JWE cifrado (`jose`), cookie `parchu_session`, 8h | `src/lib/session.ts`, `session-cookie.ts` |
| Autorización | `requireRole()` en páginas/actions + chequeo optimista en proxy | `src/lib/auth-guard.ts`, `src/proxy.ts` |
| Crypto de pedidos | código de confirmación hash + AES-256-GCM (independiente de DB) | `src/lib/confirmation-code.ts` |
| Local | `docker-compose.yml` → `postgres:16-alpine` en `:5433` | `docker-compose.yml` |
| Deploy | Render Postgres (vía `DATABASE_URL`) | `.env` |

**Acoplamiento a Prisma (lo que hay que tocar):**
`db.ts`, los 8 repos, `order-service.ts`, `business-service.ts`, `auth-service.ts`
(usa código de error `P2002`), `actions/cart/manage-cart.ts`, `lib/rate-limit.ts`,
`lib/format.ts` (tipo `Decimal`), `lib/payment-methods.ts` / `session.ts` / `auth-guard.ts`
(tipos `Role`, `PaymentType`), y `prisma/seed.ts`.

---

## ⚠️ Recomendación del arquitecto (leer antes de ejecutar)

Supabase **es** Postgres. "Migrar a Supabase" NO obliga a tirar Prisma.
El plan honra tu decisión (supabase-js nativo), pero mi recomendación profesional es
separar el valor del riesgo:

- **Alto valor, riesgo acotado:** mover la DB a Supabase, adoptar **Supabase Auth** y
  **RLS**, y usar **Storage** para las imágenes.
- **Alto riesgo, bajo valor:** reemplazar Prisma por `supabase-js`. Perdés tipado
  end-to-end generado, migraciones versionadas (`prisma migrate`), y la ergonomía de
  `$transaction`. Todas las transacciones multi-statement pasan a ser **funciones
  plpgsql (RPC)**, lo que mueve lógica de negocio crítica (reserva de stock,
  cancelación, conteo de ventas, rate-limit) a SQL.

**Dos caminos posibles** — el plan documenta ambos y marca los pasos que difieren:

- **Camino A (recomendado):** Supabase DB + Auth + RLS + Storage, **manteniendo Prisma**
  como capa de queries. Mucho menos reescritura, mismo resultado "100% Supabase".
- **Camino B (lo que pediste):** todo lo de A **+** reemplazo total de Prisma por
  `supabase-js` y transacciones como RPC.

Si no decís lo contrario, ejecuto **Camino B** (tu elección), pero cada fase marca
`[solo B]` en los pasos que solo aplican si seguís con el reemplazo de Prisma.

---

## 1. Riesgos principales y cómo los neutralizamos

| # | Riesgo | Mitigación |
| --- | --- | --- |
| R1 | **IDs `cuid` vs `uuid` de `auth.users`.** Supabase Auth genera `uuid`. Tu `User.id` es `cuid`. | Nueva tabla `profiles` con `id uuid` = `auth.users.id`. Las tablas de negocio conservan sus `cuid`. Mapeo `cuid → uuid` durante la migración de usuarios (tabla puente temporal). |
| R2 | **Hashes argon2id no portables a bcrypt.** | GoTrue (Supabase Auth) **soporta importar hashes argon2**. Se importan tal cual vía `auth.users.encrypted_password` con el formato PHC `$argon2id$...` que ya producís. Los usuarios siguen logueando con su contraseña actual. |
| R3 | **Transacciones multi-statement** (stock, cancelación, ventas) sin `$transaction` en supabase-js. `[solo B]` | Reescribir como **funciones plpgsql `SECURITY DEFINER`** y llamarlas con `rpc()`. La atomicidad vive dentro de la función (misma garantía que hoy). |
| R4 | **Rate-limit `ON CONFLICT`** sin raw SQL. `[solo B]` | Función RPC `increment_rate_limit(key, window_start)` con el mismo `INSERT ... ON CONFLICT`. |
| R5 | **RLS rompe acceso del servidor** si no se distingue cliente anon vs service-role. | Separar clientes: `anon`/usuario (respeta RLS) para flujos de usuario; `service_role` (bypassa RLS) solo en Server Actions/servicios de confianza. Nunca exponer `service_role` al browser. |
| R6 | **Flujos guest sin sesión** (checkout, seguimiento por token). | Políticas RLS explícitas para `anon` (lectura de catálogo público, inserción de pedidos vía RPC controlada). El token de seguimiento sigue siendo el secreto de acceso. |
| R7 | **Pérdida de datos en el corte.** | Migración ensayada en staging, `pg_dump` consistente, verificación de conteos + integridad referencial, y ventana de solo-lectura durante el corte final. |
| R8 | **Secretos y rotación.** `SESSION_SECRET`, claves AES, `DATABASE_URL` de Render quedan obsoletos/expuestos. | Rotar lo que deje de usarse, cargar claves Supabase (`anon`, `service_role`, JWT secret) en el entorno, nunca commitear. |
| R9 | **Middleware/proxy** basado en cookie propia. | Reescribir `proxy.ts` con `@supabase/ssr` (refresh de sesión + lectura de claim de rol). Mantener "deny by default". |

---

## 2. Fases de implementación

Cada fase cierra con su verificación. No se avanza con checks en rojo.
Las fases son tareas ODD; se hará seguimiento en `odd/tasks/migracion-supabase.md`
y su mirror en Engram **antes del primer write de código**.

### Fase 0 — Preparación y red de seguridad (sin tocar prod)
1. Crear proyecto Supabase (cloud) para **staging** y otro para **prod**.
2. Instalar Supabase CLI; `supabase init` dentro de `parchu/`.
3. `pg_dump` de Render → restaurar en un Postgres local para ensayos (backup verificado).
4. Congelar un snapshot del schema actual (`prisma migrate diff` / `pg_dump --schema-only`).
- **Check:** backup restaurable; `supabase start` levanta el stack local.

### Fase 1 — Entorno local con Supabase CLI
1. Reemplazar `docker-compose.yml` (Postgres) por el stack de `supabase start`.
2. Portar el schema: generar las migraciones SQL de Supabase a partir del schema Prisma
   actual (baseline única). Mantener enums, índices, `Decimal(12,2)`, uniques.
3. Actualizar scripts `package.json`: `db:up/down/migrate/seed/studio` → comandos `supabase`.
4. Actualizar `.env.example` y docs (`CLAUDE.md`/`README`) con las nuevas variables
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
   y `DATABASE_URL` del pooler para migraciones `[A o B]`).
- **Check:** `supabase start` + migraciones + seed reproducen el estado local actual.

### Fase 2 — Schema en Supabase + RLS
1. Crear tabla `profiles` (`id uuid PK` → `auth.users.id`, `role`, `firstName`, `lastName`,
   `createdAt`). Trigger `on auth.user created` para poblarla.
2. Mover el campo `role` a un **custom claim** del JWT (hook de Auth) para que RLS y el
   proxy lean el rol sin query extra.
3. Habilitar **RLS** en todas las tablas y escribir políticas:
   - `profiles`: el dueño ve/edita lo suyo; admin ve todo.
   - `Business`/`Product`/`PaymentMethod`/`Order`/`OrderItem`: dueño por `ownerId`;
     catálogo público (`PUBLICADO`) legible por `anon`; admin total.
   - `Notification`: solo el `userId` dueño.
   - `SellerLead`: insert `anon`, lectura admin.
   - `RateLimitAttempt`: solo `service_role` / RPC.
4. Reescribir transacciones como funciones plpgsql + `rpc()` `[solo B]`:
   `create_order_with_stock_reservation`, `cancel_order_releasing_stock`,
   `complete_order_counting_sales`, `increment_rate_limit`.
- **Check:** tests de RLS (acceso permitido/denegado por rol) en SQL o vía supabase-js;
  las funciones RPC pasan los tests de concurrencia de stock existentes.

### Fase 3 — Capa de datos en la app
1. Agregar clientes Supabase: `src/lib/supabase/server.ts` (service-role + usuario SSR) y
   `src/lib/supabase/client.ts` (browser anon), con `@supabase/ssr`.
2. **Camino A:** mantener los repos sobre Prisma apuntando al Postgres de Supabase; solo
   cambia `DATABASE_URL`. Transacciones Prisma siguen igual.
3. **Camino B:** reescribir los 8 repos con `supabase-js`; reemplazar tipos `@prisma/client`
   (`Role`, `PaymentType`, `Decimal`, modelos) por tipos generados de Supabase
   (`supabase gen types typescript`). `Decimal` → manejar como `string`/`number` con cuidado
   de redondeo monetario. Transacciones → `rpc()` (Fase 2.4). `auth-service` deja de usar
   `P2002`; el error de unicidad pasa a venir de Supabase/Auth.
- **Check:** `npm run typecheck` + toda la suite unit/integration en verde contra Supabase local.

### Fase 4 — Autenticación con Supabase Auth
1. Reemplazar registro/login:
   - `auth-service.registerEmprendedor` → `supabase.auth.signUp` (+ fila `profiles`).
   - `auth-service.login` → `supabase.auth.signInWithPassword`.
   - Mantener la defensa de timing (hash señuelo) o delegarla en GoTrue.
2. Reemplazar sesión propia por sesión Supabase:
   - Borrar/retirar `session.ts`, `session-cookie.ts` (JWE propio) y `password.ts` (argon2)
     una vez que Auth es la fuente de verdad.
   - `getSession`/`requireSession`/`requireRole` leen la sesión Supabase + claim de rol.
3. Reescribir `proxy.ts` con `@supabase/ssr` (refresh + redirect por rol), manteniendo
   "deny by default" y las rutas guest-only.
4. Conservar intacta la crypto de **código de confirmación** (AES-256-GCM) y el
   **tracking token**: son de pedidos, no de auth.
- **Check:** flujos login/registro/logout/expiración/role-guard pasan (unit + e2e Playwright).

### Fase 5 — Imágenes a Supabase Storage (incluido en "native")
1. Crear bucket (p. ej. `product-images`) con políticas de acceso.
2. Reemplazar `Product.imageBase64` por `imagePath`/URL; subir desde el cliente a Storage.
3. Migrar imágenes base64 existentes a objetos de Storage (script de backfill).
- **Check:** alta/edición de producto sube a Storage y renderiza; backfill verificado.

### Fase 6 — Migración de datos reales (Render → Supabase)
1. Ensayar **completo en staging** primero.
2. Usuarios: importar a `auth.users` con `encrypted_password` = hash argon2id existente;
   crear `profiles`; construir mapa `cuid → uuid` y **reescribir FKs** que apuntaban al
   `User.id` viejo (`Business.ownerId`, `Notification.userId`).
3. Resto de tablas: `pg_dump`/`COPY` preservando `cuid` e integridad referencial; recalcular
   nada (los `salesCount`/`stock` viajan tal cual).
4. Imágenes: backfill a Storage (Fase 5) como parte del corte.
5. **Verificación:** conteo por tabla igual origen/destino; checksums de columnas clave;
   FKs sin huérfanos; smoke test de login con usuarios reales migrados.
- **Check:** reporte de verificación en verde en staging antes de tocar prod.

### Fase 7 — Corte a producción
1. Ventana de mantenimiento: poner la app en **solo-lectura** (o breve downtime).
2. `pg_dump` final de Render → import a Supabase prod → correr verificación (Fase 6.5).
3. Cambiar variables de entorno de prod a Supabase; desplegar.
4. Smoke test en prod (login real, checkout guest, seguimiento, panel, admin).
5. Mantener Render en standby N días como rollback; recién entonces dar de baja.
- **Check:** smoke test prod OK; plan de rollback documentado y probado.

### Fase 8 — Limpieza
1. Eliminar Prisma `[solo B]`, `@node-rs/argon2`, `jose`, `docker-compose` de Postgres,
   `DATABASE_URL` de Render, y claves/secretos obsoletos (rotar lo sensible).
2. Actualizar `CLAUDE.md`, `AGENTS.md`, `README`, `.env.example`.
3. Commit(s) por work-unit en la rama de feature (Conventional Commits), tests y docs juntos.
- **Check:** build + typecheck + suite completa + e2e en verde; sin referencias muertas.

---

## 3. Orden de trabajo y dependencias

```
Fase 0 ─► Fase 1 ─► Fase 2 ─► Fase 3 ─► Fase 4 ─► Fase 5 ─┐
                                                          ├─► Fase 6 ─► Fase 7 ─► Fase 8
                                              (staging) ──┘
```

- Fases 1–5 son desarrollo reversible (no tocan prod).
- Fase 6 se ensaya en staging; Fase 7 es el único punto irreversible → requiere tu OK
  explícito y ventana acordada.

## 4. Decisiones que necesito confirmar antes de ejecutar

1. **Camino A vs B** definitivo (recordá mi recomendación: A da "100% Supabase" con
   mucho menos riesgo; B es lo que marcaste).
2. **Rol en el JWT** vía Auth Hook (recomendado) vs tabla `profiles` consultada por request.
3. **Imágenes a Storage** ahora (Fase 5) o en una iteración posterior.
4. **Downtime aceptable** en el corte (Fase 7): ¿solo-lectura breve o mantenimiento total?

## 5. Qué NO cambia

- Lógica de negocio (servicios), validaciones Zod, UI, rutas.
- Crypto de código de confirmación (AES-256-GCM) y tracking token.
- Patrón repositorio como frontera de acceso a datos (se mantiene la forma, cambia el motor).

---

### Próximo paso
Confirmá los 4 puntos de la sección 4 (sobre todo **Camino A vs B**). Con eso creo
`odd/tasks/migracion-supabase.md` + el mirror en Engram + la lista `todo`, y arranco por
la Fase 0 sin tocar producción.
