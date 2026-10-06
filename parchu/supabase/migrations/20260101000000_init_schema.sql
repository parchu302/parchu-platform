-- ParchU — schema inicial Supabase (native).
-- Traducción del schema Prisma a SQL nativo. Cambios de diseño:
--   * PKs cuid -> uuid DEFAULT gen_random_uuid().
--   * La identidad (antes modelo User) se reemplaza por `profiles`,
--     ligada 1:1 a auth.users (Supabase Auth). passwordHash desaparece.
--   * Se conservan nombres de tablas/columnas del resto para paridad.
-- RLS y funciones se habilitan en migraciones posteriores.

create extension if not exists moddatetime schema extensions;

-- ---------- enums ----------
create type "Role" as enum ('EMPRENDEDOR', 'ADMIN');
create type "BusinessStatus" as enum ('PENDIENTE', 'APROBADO', 'PAUSADO');
create type "ProductStatus" as enum ('PUBLICADO', 'OCULTO');
create type "OrderStatus" as enum ('PENDIENTE', 'RECIBIDO', 'ENTREGADO', 'COMPLETADO', 'CANCELADO');
create type "PaymentType" as enum ('TRANSFERENCIA', 'NEQUI', 'DAVIPLATA', 'YAPE_PLIN', 'EFECTIVO', 'OTRO');

-- ---------- profiles (identidad de app, 1:1 con auth.users) ----------
create table "profiles" (
  "id"         uuid primary key references auth.users (id) on delete cascade,
  "email"      text not null unique,
  "firstName"  text not null,
  "lastName"   text,
  "role"       "Role" not null default 'EMPRENDEDOR',
  "createdAt"  timestamptz not null default now()
);

-- ---------- Business ----------
create table "Business" (
  "id"           uuid primary key default gen_random_uuid(),
  "ownerId"      uuid not null references "profiles" (id),
  "name"         text not null unique,
  "description"  text not null,
  "category"     text not null,
  "contactInfo"  text not null,
  "status"       "BusinessStatus" not null default 'PENDIENTE',
  "deletedAt"    timestamptz,
  "deleteReason" text,
  "createdAt"    timestamptz not null default now()
);
create index "Business_ownerId_idx" on "Business" ("ownerId");
create index "Business_status_deletedAt_idx" on "Business" ("status", "deletedAt");

-- ---------- Product ----------
create table "Product" (
  "id"          uuid primary key default gen_random_uuid(),
  "businessId"  uuid not null references "Business" (id) on delete cascade,
  "name"        text not null,
  "description" text,
  "imageBase64" text,
  "price"       numeric(12, 2) not null,
  "category"    text not null,
  "stock"       integer not null,
  "status"      "ProductStatus" not null default 'PUBLICADO',
  "salesCount"  integer not null default 0,
  "createdAt"   timestamptz not null default now()
);
create index "Product_category_idx" on "Product" ("category");
create index "Product_status_salesCount_idx" on "Product" ("status", "salesCount" desc);

-- ---------- PaymentMethod ----------
create table "PaymentMethod" (
  "id"         uuid primary key default gen_random_uuid(),
  "businessId" uuid not null references "Business" (id) on delete cascade,
  "type"       "PaymentType" not null,
  "details"    jsonb not null,
  "createdAt"  timestamptz not null default now()
);
create index "PaymentMethod_businessId_idx" on "PaymentMethod" ("businessId");

-- ---------- Order ----------
create table "Order" (
  "id"                        uuid primary key default gen_random_uuid(),
  "businessId"                uuid not null references "Business" (id),
  "status"                    "OrderStatus" not null default 'PENDIENTE',
  "guestName"                 text not null,
  "guestContact"              text not null,
  "paymentMethodId"           uuid not null references "PaymentMethod" (id),
  "total"                     numeric(12, 2) not null,
  "confirmationCodeHash"      text not null,
  "confirmationCodeEncrypted" text not null,
  "failedAttempts"            integer not null default 0,
  "codeLocked"                boolean not null default false,
  "trackingToken"             text not null unique,
  "cancelReason"              text,
  "createdAt"                 timestamptz not null default now(),
  "updatedAt"                 timestamptz not null default now()
);
create index "Order_businessId_status_idx" on "Order" ("businessId", "status");

create trigger "Order_set_updatedAt"
  before update on "Order"
  for each row execute function extensions.moddatetime ("updatedAt");

-- ---------- OrderItem ----------
create table "OrderItem" (
  "id"        uuid primary key default gen_random_uuid(),
  "orderId"   uuid not null references "Order" (id) on delete cascade,
  "productId" uuid not null references "Product" (id),
  "quantity"  integer not null,
  "unitPrice" numeric(12, 2) not null,
  "subtotal"  numeric(12, 2) not null
);
create index "OrderItem_orderId_idx" on "OrderItem" ("orderId");
create index "OrderItem_productId_idx" on "OrderItem" ("productId");

-- ---------- SellerLead ----------
create table "SellerLead" (
  "id"        uuid primary key default gen_random_uuid(),
  "name"      text not null,
  "whatsapp"  text not null,
  "sells"     text not null,
  "createdAt" timestamptz not null default now()
);

-- ---------- Notification ----------
create table "Notification" (
  "id"        uuid primary key default gen_random_uuid(),
  "userId"    uuid not null references "profiles" (id) on delete cascade,
  "message"   text not null,
  "read"      boolean not null default false,
  "createdAt" timestamptz not null default now()
);
create index "Notification_userId_read_idx" on "Notification" ("userId", "read");

-- ---------- RateLimitAttempt ----------
create table "RateLimitAttempt" (
  "id"          uuid primary key default gen_random_uuid(),
  "key"         text not null,
  "windowStart" timestamptz not null,
  "count"       integer not null default 1,
  "createdAt"   timestamptz not null default now(),
  unique ("key", "windowStart")
);
create index "RateLimitAttempt_key_idx" on "RateLimitAttempt" ("key");
