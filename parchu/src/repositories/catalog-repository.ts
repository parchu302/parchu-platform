import { createAdminClient } from "@/lib/supabase/admin";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  price: string;
  category: string;
  stock: number;
  salesCount: number;
  businessId: string;
  businessName: string;
};

export type CatalogQuery = {
  category?: string;
  search?: string;
  page: number;
  pageSize: number;
};

// Estas RPC aun no figuran en database.types.ts: se llaman via un wrapper sin
// tipos de nombre/argumentos y se tipa el resultado manualmente.
type UntypedRpc = (
  fn: string,
  args?: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: Error | null }>;

function rpc(): UntypedRpc {
  const sb = createAdminClient();
  return sb.rpc.bind(sb) as unknown as UntypedRpc;
}

// Path critico de lectura: se resuelve con funciones RPC en la base (SQL
// parametrizado). La visibilidad publica (producto publicado, emprendimiento
// aprobado y no dado de baja) y el escape de comodines ILIKE viven en ellas.

export async function countPublicProducts(query: {
  category?: string;
  search?: string;
}): Promise<number> {
  const { data, error } = await rpc()("count_public_products", {
    p_category: query.category ?? null,
    p_search: query.search ?? null,
  });
  if (error) throw error;
  return Number(data ?? 0);
}

export async function findPublicProducts(
  query: CatalogQuery,
): Promise<CatalogProduct[]> {
  const { data, error } = await rpc()("find_public_products", {
    p_category: query.category ?? null,
    p_search: query.search ?? null,
    p_limit: query.pageSize,
    p_offset: (query.page - 1) * query.pageSize,
  });
  if (error) throw error;
  return (data ?? []) as unknown as CatalogProduct[];
}

// Categorias realmente presentes en el catalogo visible: el filtro no ofrece
// opciones que no devolverian nada.
export async function listPublicCategories(): Promise<string[]> {
  const { data, error } = await rpc()("list_public_categories");
  if (error) throw error;
  return ((data ?? []) as unknown as { category: string }[]).map(
    (row) => row.category,
  );
}

export async function findTopSellingProducts(
  limit: number,
): Promise<CatalogProduct[]> {
  return findPublicProducts({ page: 1, pageSize: limit });
}
