# ParchU — Plan de Implementación

> Marketplace universitario. "Un tablero para todo lo que se vende en el campus."
> Stack: **Next.js (App Router + Server Actions)** · **PostgreSQL** · **Prisma** · **TypeScript**.
> Este plan cubre la totalidad de los escenarios definidos en `marketplace-universitario-gherkin.md`.

---

## 1. Resumen y alcance

ParchU centraliza en una sola plataforma los productos y servicios de los emprendimientos estudiantiles. Hay tres actores:

- **Emprendedor**: se registra (correo + contraseña), registra su emprendimiento, productos y formas de pago, y administra sus pedidos.
- **Cliente**: compra **sin registro**, solo con datos básicos de contacto. Recibe un **código de confirmación** por pedido.
- **Administrador**: creado por base de datos (sin registro por UI). Ve estadísticas básicas y aprueba, pausa, reactiva o elimina emprendimientos.

El landing actual (`ParchU_marketplace_v2`) se conserva como página de inicio (`/`).

### Decisiones ya tomadas
- Next.js App Router con **Server Actions** como capa de mutaciones (sin API REST separada salvo webhooks/health).
- **Prisma** como ORM sobre PostgreSQL.
- Se implementan **todos** los escenarios Gherkin.

### Decisiones resueltas
- **Compra in-app, no por WhatsApp.** Los CTA de WhatsApp/"Súmate al tablero" del landing quedan como *captación de leads de vendedores* (formulario de contacto), no como canal de compra. El flujo de pedidos vive dentro de la plataforma tal como lo describen los Gherkin.
- **Sin comisiones en esta versión.** No se incluye lógica ni tablero de comisiones. El modelo de datos no arrastra campos de comisión.
- **Varios emprendimientos por emprendedor (1:N).** Un emprendedor puede registrar y administrar múltiples emprendimientos; cada uno se aprueba, pausa y gestiona por separado. El panel incluye un selector de emprendimiento activo.
- **Eliminación por baja lógica (soft delete).** Eliminar un emprendimiento no borra registros: lo marca como eliminado (fecha + motivo), lo oculta junto con sus productos y conserva el histórico de pedidos.
- **Notificaciones internas básicas.** No se envían correos ni SMS. Las notificaciones se registran en una tabla y se muestran dentro del panel del emprendedor/admin. El cliente invitado consulta el estado y su código mediante un **enlace de seguimiento** con token.
- **Métodos de pago configurables.** El landing es de contexto Colombia (precios en COP, WhatsApp), mientras que los Gherkin ejemplifican Yape/Plin (Perú). Se modela `PaymentMethod.type` como catálogo configurable (Transferencia, Nequi, Daviplata, Efectivo, etc.) para no acoplar a un país.

### Nota sobre acceso a datos
Se usa Prisma como se pidió. Como buena práctica de rendimiento, el **path crítico de lectura del catálogo público** (listado con filtros + orden por más vendidos + paginación) se resuelve con **consultas explícitas y eficientes** (`prisma.$queryRaw` o índices + `select` acotado), reservando el ORM para el resto del CRUD. Así se evita degradar la vista de mayor tráfico.

---

## 2. Stack técnico

| Capa | Elección | Notas |
|------|----------|-------|
| Framework | Next.js (App Router) | Server Components por defecto; Client Components solo donde haya interacción. |
| Mutaciones | Server Actions | Validación con Zod en el borde de cada action. |
| DB | PostgreSQL 16 | |
| ORM | Prisma | Migraciones versionadas (`prisma migrate`). |
| Auth | Sesión propia con cookie **HttpOnly** | Sin librería pesada; sesión firmada/cifrada (p. ej. `jose`), hashing de contraseña con **argon2id**. |
| Validación | Zod | Compartida entre cliente y server actions. |
| Estilos | Tailwind CSS + tokens de marca ParchU | Reutiliza la paleta del landing. |
| Estado UI | React state / `nuqs` para filtros en URL | Filtros y paginación del catálogo en query params (compartibles, SSR-friendly). |
| Tests | Vitest (unit) + Playwright + `playwright-bdd` (E2E desde `.feature`) | Los Gherkin manejan los tests E2E directamente. |
| Infra | Vercel + Postgres gestionado (Neon/Supabase/RDS) | |

### Tokens de marca (del landing)
```
--paper:#EFE7D8  --paper-2:#E7DCC5  --ink:#2B2118
--mustard:#E3A72A  --teal:#1F6F6B  --coral:#E2574C  --line:rgba(43,33,24,.18)
```
Fuentes: `Archivo Black` (titulares), `Work Sans` (texto), `JetBrains Mono` (acentos).

---

## 3. Arquitectura

Separación de responsabilidades (alineada con "control plane" vs "data plane"):

```
UI (Server/Client Components)
        │  (invoca)
Server Actions  ──►  validación (Zod) + autorización (rol/sesión)
        │  (delega)
Servicios de dominio  ──►  reglas de negocio + máquinas de estado
        │
Repositorios (Prisma / SQL explícito)  ──►  PostgreSQL
```

Principios:
- **Autorización centralizada**: un helper `requireRole(...)` / `getSession()` que toda action protegida invoca. Nada de checks dispersos.
- **Máquinas de estado explícitas** para `Emprendimiento` y `Pedido` (§6): las transiciones inválidas se rechazan en el servicio, no en la UI.
- **Acciones destructivas** (eliminar emprendimiento) exigen confirmación explícita en UI + motivo obligatorio.
- **Efectos secundarios desacoplados**: las notificaciones a comprador/emprendedor pasan por un `NotificationService` (interfaz), con una implementación inicial simple (correo/registro en tabla) intercambiable.

---

## 4. Modelo de datos (PostgreSQL / Prisma)

```prisma
// enums
enum Role            { EMPRENDEDOR ADMIN }
enum BusinessStatus  { PENDIENTE APROBADO PAUSADO }
enum ProductStatus   { PUBLICADO OCULTO }
enum OrderStatus     { PENDIENTE RECIBIDO ENTREGADO COMPLETADO CANCELADO }
enum PaymentType     { TRANSFERENCIA NEQUI DAVIPLATA YAPE_PLIN EFECTIVO OTRO }

model User {
  id           String     @id @default(cuid())
  email        String     @unique
  passwordHash String
  firstName    String
  lastName     String?
  role         Role       @default(EMPRENDEDOR)
  businesses   Business[] // 1 emprendedor : N emprendimientos
  createdAt    DateTime   @default(now())
}

model Business {
  id          String         @id @default(cuid())
  ownerId     String
  owner       User           @relation(fields: [ownerId], references: [id])
  name        String         @unique          // nombre único global
  description String
  category    String
  contactInfo String
  status      BusinessStatus @default(PENDIENTE)
  deletedAt   DateTime?                        // soft delete
  deleteReason String?
  products    Product[]
  paymentMethods PaymentMethod[]
  orders      Order[]
  createdAt   DateTime       @default(now())
  @@index([ownerId])
  @@index([status, deletedAt])
}

model Product {
  id          String        @id @default(cuid())
  businessId  String
  business    Business      @relation(fields: [businessId], references: [id], onDelete: Cascade)
  name        String
  description String?
  price       Decimal       @db.Numeric(12,2)   // >= 0 (validado en servicio)
  category    String
  stock       Int                              // >= 0
  status      ProductStatus @default(PUBLICADO)
  salesCount  Int           @default(0)         // denormalizado para "más vendidos"
  createdAt   DateTime      @default(now())
  orderItems  OrderItem[]
  @@index([category])
  @@index([status, salesCount(sort: Desc)])     // catálogo público
}

model PaymentMethod {
  id         String      @id @default(cuid())
  businessId String
  business   Business    @relation(fields: [businessId], references: [id], onDelete: Cascade)
  type       PaymentType
  details    Json        // datos requeridos según el método
  createdAt  DateTime    @default(now())
}

model Order {
  id                   String      @id @default(cuid())
  businessId           String
  business             Business    @relation(fields: [businessId], references: [id])
  status               OrderStatus @default(PENDIENTE)
  // datos del cliente invitado (sin cuenta)
  guestName            String
  guestContact         String      // correo o teléfono validado
  paymentMethodId      String
  total                Decimal     @db.Numeric(12,2)
  // código de confirmación
  confirmationCodeHash String      // hash del código, nunca en claro
  failedAttempts       Int         @default(0)
  codeLocked           Boolean     @default(false)
  trackingToken        String      @unique         // enlace de seguimiento del cliente invitado
  cancelReason         String?
  items                OrderItem[]
  createdAt            DateTime    @default(now())
  updatedAt            DateTime    @updatedAt
  @@index([businessId, status])
}

model OrderItem {
  id        String  @id @default(cuid())
  orderId   String
  order     Order   @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Decimal @db.Numeric(12,2)  // snapshot al momento de la compra
  subtotal  Decimal @db.Numeric(12,2)
}

model SellerLead {  // formulario "Súmate al tablero" del landing
  id        String   @id @default(cuid())
  name      String
  whatsapp  String
  createdAt DateTime @default(now())
}

model Notification {   // notificaciones internas (sin correo/SMS)
  id         String   @id @default(cuid())
  userId     String   // destinatario (emprendedor o admin)
  message    String
  read       Boolean  @default(false)
  createdAt  DateTime @default(now())
  @@index([userId, read])
}
```

Notas de modelado:
- **1 emprendedor : N emprendimientos**. `ownerId` no es único; el emprendedor selecciona el emprendimiento activo en el panel. El nombre de emprendimiento sí es único a nivel global (`@unique`).
- **Soft delete**: eliminar un emprendimiento setea `deletedAt` + `deleteReason`. Todas las consultas públicas y del vendedor filtran `deletedAt IS NULL`; el histórico de pedidos permanece intacto.
- El **código de confirmación se guarda hasheado** (`confirmationCodeHash`); en claro solo se muestra al cliente en la confirmación de compra y en su página de seguimiento.
- **Enlace de seguimiento**: `trackingToken` (aleatorio, no adivinable) da acceso a `/seguimiento/[token]` donde el cliente invitado ve estado y código actual del pedido. Es el canal por el que recibe un código regenerado tras un desbloqueo.
- **Reserva de stock**: se descuenta `stock` al crear el pedido y se restaura al cancelar (transacción atómica).

---

## 5. Autenticación y autorización

- **Registro de emprendedor**: correo único, contraseña hasheada (argon2id), validación de formato de correo y política de contraseña (longitud mín., mayúscula, número). Cuenta activa de inmediato.
- **Login** (emprendedor y admin) con el mismo mecanismo. Mensaje de error **genérico** ("credenciales inválidas") para no revelar existencia del correo.
- **Sesión** en cookie **HttpOnly**, `Secure`, `SameSite=Lax`, firmada/cifrada. Sin exponer el token a JS.
- **Admin** sembrado por script/seed (`prisma db seed`) o migración de datos; nunca por UI.
- **Middleware** de Next protege rutas por rol:
  - `/panel/**` → EMPRENDEDOR con emprendimiento.
  - `/admin/**` → ADMIN.
  - `/`, `/productos`, `/checkout` → públicas.
- **Checkout de cliente**: sin sesión. Se validan datos de contacto; el pedido se asocia por `guestContact` y genera un `trackingToken` para la página pública de seguimiento (`/seguimiento/[token]`).
- **Notificaciones**: solo internas (tabla `Notification`), visibles en el panel de emprendedor/admin. Sin correo ni SMS en esta versión.

Reglas de seguridad transversales:
- Nunca hardcodear credenciales; todo por variables de entorno (`.env`, no versionado). `.env.example` documentado.
- Datos externos (formularios, query params) tratados como **entrada pasiva** y validados con Zod antes de tocar la DB.
- Acciones destructivas o irreversibles (eliminar emprendimiento) requieren confirmación + motivo.

---

## 6. Máquinas de estado

### Emprendimiento
```
PENDIENTE ──aprobar──► APROBADO ──pausar──► PAUSADO
                          ▲                    │
                          └─────reactivar──────┘
cualquier estado ──eliminar──► (soft delete: deletedAt + motivo, oculto, histórico conservado)
```
- `pausar` solo válido desde `APROBADO` (rechaza `PENDIENTE`).
- `PAUSADO` oculta productos de la vista pública; `reactivar` los vuelve a mostrar.
- `eliminar` es baja lógica: setea `deletedAt`; el emprendimiento y sus productos dejan de ser visibles, pero los pedidos históricos se conservan.

### Pedido
```
PENDIENTE ──recibir──► RECIBIDO ──marcar entregado──► ENTREGADO ──código OK──► COMPLETADO
    │                     │
    └──cancelar──┐   └──cancelar──┐
                 ▼                ▼
              CANCELADO (libera stock)
```
- `cancelar` válido desde `PENDIENTE` y `RECIBIDO`; **no** desde `ENTREGADO` ni `COMPLETADO`.
- `marcar entregado` solo desde `RECIBIDO`.
- **Completado** lo dispara el **emprendedor** validando el **código de confirmación** (reemplaza la confirmación del comprador):
  - código correcto → `COMPLETADO`, reinicia `failedAttempts`, `salesCount++` de los productos.
  - código incorrecto → `failedAttempts++`, sin cambio de estado.
  - al **3.º intento** fallido → `codeLocked = true`, requiere intervención del administrador.
  - validar código solo permitido si el pedido está en `ENTREGADO`.
- **Desbloqueo (admin)**: si `codeLocked`, el administrador **regenera** el código → nuevo `confirmationCodeHash`, `failedAttempts = 0`, `codeLocked = false`. El cliente ve el nuevo código en `/seguimiento/[token]`. Regenerar sobre un pedido no bloqueado se rechaza.

---

## 7. Trazabilidad Gherkin → Implementación

| Feature Gherkin | Módulo | Fase |
|---|---|---|
| 0.1 Registro/login de emprendedores | Auth | 1 |
| 0.2 Login y gestión de administrador | Auth + Admin | 1, 2 |
| 0.3 Compra de clientes sin registro | Checkout | 5 |
| 1. Registro de emprendimiento | Emprendimientos | 2 |
| 2. Registro de productos y formas de pago | Catálogo (vendedor) | 3 |
| 3. Administración de pedidos (+código) | Pedidos | 6 |
| 4. Exploración de productos (filtros + paginación) | Catálogo público | 4 |

Cada `Feature` se traduce a un archivo `*.feature` ejecutable con `playwright-bdd`, garantizando que cada escenario tenga su prueba E2E.

---

## 8. Estructura de carpetas

```
parchu/
├─ prisma/
│  ├─ schema.prisma
│  ├─ migrations/
│  └─ seed.ts                # admin + datos demo
├─ src/
│  ├─ app/
│  │  ├─ page.tsx            # LANDING (migrado del HTML actual)
│  │  ├─ productos/          # catálogo público (filtros, búsqueda, paginación)
│  │  ├─ checkout/           # compra guest
│  │  ├─ seguimiento/[token]/ # página pública de seguimiento del pedido (estado + código)
│  │  ├─ (auth)/login, registro
│  │  ├─ panel/              # emprendedor: selector de emprendimiento + productos, pagos, pedidos
│  │  └─ admin/              # estadísticas + gestión de emprendimientos + desbloqueo de pedidos
│  ├─ actions/               # Server Actions (por dominio)
│  ├─ services/              # reglas de negocio + máquinas de estado
│  ├─ repositories/          # Prisma + queries SQL explícitas (catálogo)
│  ├─ lib/                   # auth, session, zod schemas, notificaciones
│  ├─ components/            # UI (tokens de marca ParchU)
│  └─ styles/
├─ tests/
│  ├─ features/              # *.feature (los Gherkin)
│  ├─ steps/                 # step definitions
│  └─ unit/                  # servicios y máquinas de estado
├─ .env.example
└─ ...
```

---

## 9. Landing como página de inicio

- Migrar `ParchU_marketplace_v2.html` a `app/page.tsx` como Server Component estático.
- Extraer los tokens de color/tipografía a la config de Tailwind y a `styles/tokens.css`.
- El grid "El tablero" (productos de ejemplo) se conecta a datos reales: enlaza a `/productos` y, más adelante, muestra destacados reales (más vendidos).
- El formulario "Súmate al tablero" persiste en `SellerLead` (Server Action) y opcionalmente abre WhatsApp. **No** es el flujo de compra.
- CTAs de navegación apuntan a `/productos`, `/login`, `/registro`.

---

## 10. Seguridad y buenas prácticas (checklist)

- [ ] Contraseñas con argon2id; nunca en logs ni respuestas.
- [ ] Cookies de sesión `HttpOnly + Secure + SameSite`.
- [ ] Validación Zod en toda Server Action (entrada = pasiva).
- [ ] Autorización por rol centralizada; deny by default en `/panel` y `/admin`.
- [ ] Código de confirmación hasheado en reposo; comparación en tiempo constante.
- [ ] Rate-limiting en login, registro y validación de código.
- [ ] Transacciones atómicas en creación/cancelación de pedidos (stock).
- [ ] Índices en catálogo (`status, salesCount`, `category`) y consultas acotadas.
- [ ] Confirmación + motivo obligatorio en eliminación de emprendimiento.
- [ ] `.env` fuera de git; `.env.example` documentado.

---

## 11. Plan por fases

| Fase | Entregable | Cubre |
|------|-----------|-------|
| **0. Setup** | Repo, Next+TS, Tailwind, Prisma, Postgres local, CI, `.env.example`, migración del landing a `/`, tabla `SellerLead`. | Landing |
| **1. Auth** | Registro/login emprendedor, login admin, sesión HttpOnly, roles, middleware, notificaciones internas. | 0.1, 0.2 (login) |
| **2. Emprendimientos + Admin** | Registro de **varios** emprendimientos (nombre único global, validaciones), selector de emprendimiento activo, panel admin: stats básicas, aprobar/pausar/reactivar/**eliminar (soft delete)**. | 1, 0.2 |
| **3. Productos + Pagos** | CRUD de productos (validaciones precio/stock), formas de pago, bloqueo si el emprendimiento no está aprobado. | 2 |
| **4. Catálogo público** | Listado con filtros por categoría, buscador, orden por más vendidos, paginación (query params), excluyendo pausados/eliminados. | 4 |
| **5. Checkout guest** | Compra con datos básicos, validaciones, reserva de stock, generación de código + `trackingToken` y página `/seguimiento/[token]`. | 0.3 |
| **6. Pedidos** | Panel de pedidos, transiciones (recibir/cancelar/entregar), validación de código + bloqueo por intentos, **desbloqueo por regeneración desde admin**. | 3, 0.2 |
| **7. Hardening** | Tests E2E desde `.feature`, rate-limiting, accesibilidad, deploy. | todos |

---

## 12. Decisiones resueltas

Todas las decisiones quedaron cerradas; no hay puntos abiertos que bloqueen la implementación.

1. **Desbloqueo de código (admin)** → el administrador **regenera** el código: nuevo código, contador de intentos a cero y validación desbloqueada. El cliente lo consulta en su enlace de seguimiento. Escenario agregado en el Gherkin 0.2.
2. **Comisión 8%** → **fuera de alcance** en esta versión. Sin lógica ni campos de comisión en el modelo.
3. **Eliminación de emprendimiento** → **soft delete** (`deletedAt` + motivo); oculta emprendimiento y productos, conserva histórico de pedidos.
4. **Emprendedor : emprendimientos** → **1:N**. Selector de emprendimiento activo en el panel; nombre de emprendimiento único a nivel global.
5. **Notificaciones** → **internas básicas** (tabla `Notification` mostrada en el panel). Sin correo ni SMS. El cliente invitado usa la página de seguimiento.
