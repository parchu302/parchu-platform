# RETOME — Migración a Supabase (parchu)

> Punto de guardado para continuar en otra sesión. Leer junto con
> `odd/tasks/migracion-supabase.md` y `parchu-plan-migracion-supabase.md`.

## Dónde estamos (resumen de una línea)
Migración native a Supabase casi completa: DB + capa de datos + auth + verificación
de correo + unit tests (runtime) + limpieza de Prisma → **HECHO y commiteado**.
Falta: (1) arreglar 41 errores de `tsc` en tests/unit, (2) terminar y correr los
tests **e2e** (hay WIP sin commitear), (3) config del Dashboard remoto para prod.

## Rama y commits
- Rama: **`feat/migracion-supabase`** (15 commits). Último: `e260477`.
- Orden: scaffold → schema → RLS/hook → RPC → tipos → RPC catálogo → capa datos →
  auth → verificación correo → unit tests → limpieza Prisma → seed.

## Cómo levantar el entorno al retomar (WSL + Docker)
1. Permiso del socket Docker (cada sesión WSL, o hacerlo persistente):
   `sudo chmod 666 /var/run/docker.sock`  (persistente: `sudo usermod -aG docker $USER` + reabrir WSL)
2. Stack local Supabase: `cd parchu && npx --yes supabase start`
   - API http://127.0.0.1:54321 · Studio :54323 · Mailpit (correos) :54324 · DB :54322
   - Keys locales (no secretas): anon `sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH`,
     service `sb_secret_N7UND0UgjKTVK-Uodkm0Hg_xSvEMPvz`.
   - `.env.test` (gitignored) ya apunta al local.
3. Proyecto remoto (cloud): ref `ngqleggzurgilmjqvrho` (org `vdimbwhnoyhinzharvyy`).
   Las 5 migraciones ya están aplicadas allí también.

## Peculiaridades del entorno (IMPORTANTE)
- `/mnt/c` (Windows) rompe chmod: `npm install` SIEMPRE con `--no-bin-links`.
  No existe `node_modules/.bin/` → correr herramientas por node directo:
  - tsc: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json`
  - vitest: `node node_modules/vitest/vitest.mjs run tests/unit`
  - bddgen: `node node_modules/playwright-bdd/dist/cli/index.js`
  - playwright: `node node_modules/@playwright/test/cli.js test`  (chromium YA instalado)
- git no puede escribir `.git/config` (EPERM): commitear con identidad inline:
  `git -c user.name="EMER" -c user.email="emer@parchu.local" -c core.safecrlf=false commit ...`
- Working tree tiene ~160 archivos "modificados" que son SOLO CRLF (verificar con
  `git diff --ignore-cr-at-eol`). Commitear solo archivos realmente tocados.

## HECHO y verificado
- **DB** (local + remoto): schema uuid/enums/índices, `profiles`↔`auth.users`,
  trigger `handle_new_user` (rol forzado EMPRENDEDOR), `custom_access_token_hook`
  (claim user_role, OPCIONAL: RLS usa `is_admin()/owns_business()` que leen profiles),
  RLS por tabla, 5 RPC (`create_order_with_stock_reservation`,
  `cancel_order_releasing_stock`, `complete_order_counting_sales`,
  `increment_rate_limit`, catálogo: `count/find_public_products`,
  `list_public_categories`). Smoke test funcional en remoto: OK.
- **App** (`src/`): 0 `@prisma/client`; typecheck `src/` = 0 errores (tras `next typegen`).
  Repos/servicios usan `createAdminClient()` (service-role) + embeds PostgREST
  (validados con curl: 6/6 OK) + `@/lib/money`. Auth con `@supabase/ssr`
  (`getSession` lee rol de profiles), proxy reescrito.
- **Verificación de correo** (requerimiento): registro con `emailRedirectTo`, ruta
  `/auth/confirm` (verifyOtp), UI "revisá tu correo", login distingue no-confirmado.
  Local: `enable_confirmations=true` + template + Mailpit.
- **Unit tests**: vitest **140 passed (13 archivos)** contra Supabase local.
- **Prisma retirado**: sin @prisma/client/prisma/@node-rs/argon2/jose, sin
  docker-compose, sin prisma/. Scripts npm → comandos supabase.
- **Seed** (`supabase/seed.ts`): crea admin+sellers (Admin API, confirmados) +
  negocios/productos. Verificado contra local (catálogo RPC devuelve lo esperado).

## PENDIENTE (lo que falta para "todo verde")

### P1 — tests/unit: 41 errores de `tsc` (strict null / `never`)
- vitest pasa (runtime) pero `npm run typecheck` FALLA. Archivos:
  `catalog-public.test.ts`, `catalog-service.test.ts`, `order-service.test.ts`,
  y sobre todo `order-lifecycle.test.ts`.
- Causa: resultados de supabase (`.maybeSingle()` → posible null; inserts/updates
  cuyo tipo infiere `never` en los helpers). Arreglar con aserciones no-nulas (`!`)
  o tipando los helpers (`tests/unit/helpers/supabase.ts`). Mecánico.
- Chequeo: `node node_modules/typescript/bin/tsc --noEmit -p tsconfig.json | grep tests/unit` → 0.

### P2 — tests/e2e: WIP SIN COMMITEAR, nunca corrido
- Un worker (cancelado) migró 10 archivos a `createAdminClient()` pero NO se verificó
  ni corrió. Cambios reales (ignorando CRLF) en:
  `tests/steps/{helpers,auth,business,catalog,catalog-public,checkout,orders,tamper}.ts`,
  `tests/e2e/route-guards.spec.ts`, `tests/features/0.1-registro-login-emprendedores.feature`.
  (705 ins / 384 del). `tests/steps/{world,shared}.steps.ts` y `tests/e2e/cart-navigation.spec.ts`
  no necesitaban cambios (no usaban Prisma).
- Estos archivos TIPAN OK (tsc no marca errores en tests/steps).
- TODO: revisar el WIP, ajustar el flujo de registro (debe confirmar vía Mailpit API
  `GET http://127.0.0.1:54324/api/v1/messages` → extraer link `/auth/confirm?...` y
  visitarlo, o crear usuarios confirmados con `auth.admin.createUser({email_confirm:true})`
  y usar `loginThroughUi`), y correr:
  `node node_modules/playwright-bdd/dist/cli/index.js && node node_modules/@playwright/test/cli.js test`
  (webServer = next dev :3100, hereda `.env.test` → usa Supabase local). Iterar a verde.
- OJO: el último intento de `playwright test` fue abortado por el usuario; estado real
  de pass/fail DESCONOCIDO. Empezar por correr la suite y leer los fallos.

### P3 — Dashboard remoto (solo para producción, decisión del usuario: correo ON)
- Authentication > URL Configuration: Site URL del deploy + Redirect URLs incluir
  `<site>/auth/confirm`.
- Authentication > Emails > template "Confirm signup": link a
  `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup`.
- Configurar SMTP (prod). En local usa Mailpit.
- (Local ya cubierto por `supabase/config.toml` + `supabase/templates/confirmation.html`.)

## Cómo retomar (pasos sugeridos)
1. `mem_context` + `mem_search "migracion-supabase"` + leer este archivo.
2. Levantar Docker socket + `supabase start` + confirmar `.env.test`.
3. P1 (rápido): arreglar tsc en tests/unit → `tsc` y `vitest` en verde.
4. P2: revisar WIP e2e → correr bddgen+playwright → iterar a verde (commitear al pasar).
5. Correr `npm run typecheck` completo (debe dar 0) como gate final.
6. P3 cuando se vaya a deploy.
7. Verificación manual opcional: `npm run dev`, registro → Mailpit → confirmar → /panel,
   login, catálogo, checkout.
