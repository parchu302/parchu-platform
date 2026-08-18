import Link from "next/link";

type CatalogFiltersProps = {
  categories: string[];
  activeCategory?: string;
  search?: string;
};

function buildHref(params: { categoria?: string; q?: string }): string {
  const query = new URLSearchParams();
  if (params.categoria) query.set("categoria", params.categoria);
  if (params.q) query.set("q", params.q);
  const queryString = query.toString();
  return queryString ? `/productos?${queryString}` : "/productos";
}

// Sin JavaScript de cliente: los filtros son enlaces y el buscador un form GET.
// Como ninguno arrastra `page`, cambiar de filtro o de término vuelve siempre a
// la primera página por construcción, no por una regla que haya que recordar.
export function CatalogFilters({
  categories,
  activeCategory,
  search,
}: CatalogFiltersProps) {
  const hasFilters = Boolean(activeCategory || search);

  return (
    <div className="grid gap-5">
      <form
        action="/productos"
        method="get"
        role="search"
        className="flex flex-wrap gap-3"
      >
        {activeCategory ? (
          <input type="hidden" name="categoria" value={activeCategory} />
        ) : null}
        <input
          id="catalog-search"
          name="q"
          type="search"
          defaultValue={search ?? ""}
          placeholder="Busca por nombre: brownie, anillado..."
          aria-label="Buscar productos por nombre"
          className="min-w-[240px] flex-1 rounded border-2 border-ink bg-paper px-3.5 py-3 text-[14.5px]"
        />
        <button
          type="submit"
          className="cursor-pointer rounded border-2 border-ink bg-ink px-6 py-3 text-[14.5px] font-bold text-paper"
        >
          Buscar
        </button>
        {hasFilters ? (
          <Link
            href="/productos"
            data-testid="catalog-clear"
            className="rounded border-2 border-ink bg-paper px-6 py-3 text-[14.5px] font-bold text-ink no-underline"
          >
            Limpiar
          </Link>
        ) : null}
      </form>

      <div className="flex flex-wrap gap-3">
        <Link
          href={buildHref({ q: search })}
          aria-current={activeCategory ? undefined : "page"}
          data-category="Todos"
          className={`rounded-[20px] border-2 px-4 py-2 font-mono text-[13px] font-semibold no-underline ${
            activeCategory
              ? "border-ink bg-paper text-ink"
              : "border-teal bg-teal text-paper"
          }`}
        >
          Todos
        </Link>
        {categories.map((category) => (
          <Link
            key={category}
            href={buildHref({ categoria: category, q: search })}
            aria-current={category === activeCategory ? "page" : undefined}
            data-category={category}
            className={`rounded-[20px] border-2 px-4 py-2 font-mono text-[13px] font-semibold no-underline ${
              category === activeCategory
                ? "border-teal bg-teal text-paper"
                : "border-ink bg-paper text-ink"
            }`}
          >
            {category}
          </Link>
        ))}
      </div>
    </div>
  );
}
