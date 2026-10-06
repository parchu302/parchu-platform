-- Catálogo público: funciones de búsqueda (reemplazan el raw SQL dinámico de
-- catalog-repository.ts). Mantienen la lógica de visibilidad y el escape de
-- comodines LIKE en la base. Solo exponen datos ya públicos.

-- Visibilidad: producto PUBLICADO + negocio APROBADO y no dado de baja.
create or replace function public.count_public_products(
  p_category text default null,
  p_search text default null
) returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::int
  from public."Product" p
  join public."Business" b on b."id" = p."businessId"
  where p."status" = 'PUBLICADO'
    and b."status" = 'APROBADO'
    and b."deletedAt" is null
    and (p_category is null or p."category" = p_category)
    and (
      p_search is null or
      p."name" ilike '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
    );
$$;

create or replace function public.find_public_products(
  p_category text default null,
  p_search text default null,
  p_limit integer default 12,
  p_offset integer default 0
) returns table (
  id uuid,
  name text,
  description text,
  image text,
  price text,
  category text,
  stock integer,
  "salesCount" integer,
  "businessId" uuid,
  "businessName" text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    p."id",
    p."name",
    p."description",
    p."imageBase64" as image,
    p."price"::text as price,
    p."category",
    p."stock",
    p."salesCount",
    b."id" as "businessId",
    b."name" as "businessName"
  from public."Product" p
  join public."Business" b on b."id" = p."businessId"
  where p."status" = 'PUBLICADO'
    and b."status" = 'APROBADO'
    and b."deletedAt" is null
    and (p_category is null or p."category" = p_category)
    and (
      p_search is null or
      p."name" ilike '%' || replace(replace(replace(p_search, '\', '\\'), '%', '\%'), '_', '\_') || '%' escape '\'
    )
  order by p."salesCount" desc, p."name" asc
  limit p_limit offset p_offset;
$$;

create or replace function public.list_public_categories()
returns table (category text)
language sql
stable
security definer
set search_path = ''
as $$
  select distinct p."category"
  from public."Product" p
  join public."Business" b on b."id" = p."businessId"
  where p."status" = 'PUBLICADO'
    and b."status" = 'APROBADO'
    and b."deletedAt" is null
  order by p."category" asc;
$$;

-- Catálogo es público: estas funciones solo devuelven datos ya visibles.
grant execute on function public.count_public_products(text, text) to anon, authenticated, service_role;
grant execute on function public.find_public_products(text, text, integer, integer) to anon, authenticated, service_role;
grant execute on function public.list_public_categories() to anon, authenticated, service_role;
