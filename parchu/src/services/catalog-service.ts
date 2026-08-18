import {
  type CatalogProduct,
  countPublicProducts,
  findPublicProducts,
} from "@/repositories/catalog-repository";

export const CATALOG_PAGE_SIZE = 20;

export type CatalogResult = {
  products: CatalogProduct[];
  total: number;
  totalPages: number;
  /** Página realmente mostrada (acotada al rango válido). */
  page: number;
  /** Página que pidió el cliente, antes de acotarla. */
  requestedPage: number;
  /** true cuando se pidió una página que no existe. */
  pageOutOfRange: boolean;
  category?: string;
  search?: string;
};

function normalizeText(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function normalizePage(value: string | number | undefined): number {
  const parsed =
    typeof value === "number" ? value : Number.parseInt(value ?? "1", 10);
  return Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 1;
}

export async function getCatalogPage(input: {
  category?: string;
  search?: string;
  page?: string | number;
  pageSize?: number;
}): Promise<CatalogResult> {
  const category = normalizeText(input.category);
  const search = normalizeText(input.search);
  const pageSize = input.pageSize ?? CATALOG_PAGE_SIZE;
  const requestedPage = normalizePage(input.page);

  const total = await countPublicProducts({ category, search });
  const totalPages = Math.ceil(total / pageSize);

  // Pedir una página inexistente no vacía el listado: se devuelve la última
  // válida y se avisa, como pide el caso de uso.
  const pageOutOfRange = total > 0 && requestedPage > totalPages;
  const page = total === 0 ? 1 : Math.min(requestedPage, totalPages);

  const products =
    total === 0
      ? []
      : await findPublicProducts({ category, search, page, pageSize });

  return {
    products,
    total,
    totalPages,
    page,
    requestedPage,
    pageOutOfRange,
    category,
    search,
  };
}
