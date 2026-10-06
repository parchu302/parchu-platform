# Variables de entorno — Supabase

Copiá estas claves a tu `.env.local` (dev) y al entorno de deploy.
Las `NEXT_PUBLIC_*` son públicas (van al navegador). La `SERVICE_ROLE` es **secreta**.

## Proyecto remoto (cloud)

```
NEXT_PUBLIC_SUPABASE_URL=https://ngqleggzurgilmjqvrho.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_7qx1-Hy7JkXc-MW_wif9sw_crpydgqR
# Secreta — obtenela en Dashboard > Project Settings > API > service_role key
SUPABASE_SERVICE_ROLE_KEY=<pegar-service-role-key>
```

## Local (supabase start, requiere Docker)

Al correr `supabase start`, la CLI imprime URL y keys locales. Típicamente:

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key que imprime la CLI>
SUPABASE_SERVICE_ROLE_KEY=<service_role key que imprime la CLI>
```

## Pendiente de retirar (tras completar la migración)

- `DATABASE_URL` (Render / Postgres directo) — ya no se usa con supabase-js.
- `SESSION_SECRET` — reemplazado por Supabase Auth.
- Claves AES del código de confirmación: **se conservan** (crypto de pedidos).
