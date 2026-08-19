import Link from "next/link";
import type { Metadata } from "next";

import { CartSummaryLink } from "@/components/checkout/CartSummaryLink";
import { CatalogFilters } from "@/components/catalog/CatalogFilters";
import { Pagination } from "@/components/catalog/Pagination";
import { ProductCard } from "@/components/catalog/ProductCard";
import { listPublicCategories } from "@/repositories/catalog-repository";
import { getCatalogPage } from "@/services/catalog-service";

export const metadata: Metadata = {
  title: "Productos — ParchU",
  description: "Todo lo que se vende en tu campus, en un solo tablero.",
};

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function ProductosPage({
  searchParams,
}: PageProps<"/productos">) {
  const params = await searchParams;

  const [result, categories] = await Promise.all([
    getCatalogPage({
      category: firstValue(params.categoria),
      search: firstValue(params.q),
      page: firstValue(params.page),
    }),
    listPublicCategories(),
  ]);

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <CartSummaryLink />

      <Link href="/" className="font-mono text-xs font-bold text-teal">
        ← ParchU
      </Link>

      <h1 className="mb-2 mt-4 font-display text-[clamp(26px,4vw,38px)]">
        El tablero del campus
      </h1>
      <p className="mb-8 text-[15px] text-ink/75">
        Ordenados por los más vendidos.
      </p>

      <CatalogFilters
        categories={categories}
        activeCategory={result.category}
        search={result.search}
      />

      {result.pageOutOfRange ? (
        <p
          role="alert"
          data-testid="catalog-page-error"
          className="mt-6 rounded border-2 border-coral bg-coral/10 px-3 py-2 text-[13.5px] font-semibold text-coral"
        >
          La página {result.requestedPage} no existe. Te mostramos la última
          página disponible.
        </p>
      ) : null}

      {result.total === 0 ? (
        <p
          data-testid="catalog-empty"
          className="mt-10 rounded-lg border-2 border-dashed border-line p-8 text-center text-[15px] text-ink/70"
        >
          No se encontraron productos.
        </p>
      ) : (
        <>
          <p className="mt-6 font-mono text-[13px] text-ink/70">
            <span data-testid="catalog-total">{result.total}</span> productos
            encontrados ·{" "}
            <span data-testid="catalog-total-pages">{result.totalPages}</span>{" "}
            {result.totalPages === 1 ? "página" : "páginas"}
          </p>

          <ul className="mt-6 grid list-none grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-6 p-0">
            {result.products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ul>

          <Pagination
            page={result.page}
            totalPages={result.totalPages}
            category={result.category}
            search={result.search}
          />
        </>
      )}
    </main>
  );
}
