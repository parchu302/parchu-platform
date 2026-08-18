import Link from "next/link";

type PaginationProps = {
  page: number;
  totalPages: number;
  category?: string;
  search?: string;
};

function pageHref(params: {
  page: number;
  category?: string;
  search?: string;
}): string {
  const query = new URLSearchParams();
  if (params.category) query.set("categoria", params.category);
  if (params.search) query.set("q", params.search);
  if (params.page > 1) query.set("page", String(params.page));
  const queryString = query.toString();
  return queryString ? `/productos?${queryString}` : "/productos";
}

export function Pagination({
  page,
  totalPages,
  category,
  search,
}: PaginationProps) {
  // Con una sola página (o ninguna) no se renderizan controles: el caso de uso
  // pide que no se muestren, no que se muestren inhabilitados.
  if (totalPages <= 1) return null;

  const LINK =
    "rounded border-2 border-ink bg-paper px-4 py-2 font-mono text-[12.5px] font-bold no-underline";
  const DISABLED =
    "rounded border-2 border-line bg-paper/50 px-4 py-2 font-mono text-[12.5px] font-bold text-ink/40";

  return (
    <nav
      aria-label="Paginación"
      data-testid="pagination"
      className="mt-10 flex flex-wrap items-center gap-3"
    >
      {page > 1 ? (
        <Link
          href={pageHref({ page: page - 1, category, search })}
          data-testid="pagination-prev"
          className={LINK}
        >
          ← Anterior
        </Link>
      ) : (
        <span className={DISABLED}>← Anterior</span>
      )}

      <span data-testid="pagination-status" className="font-mono text-[13px]">
        Página {page} de {totalPages}
      </span>

      {page < totalPages ? (
        <Link
          href={pageHref({ page: page + 1, category, search })}
          data-testid="pagination-next"
          className={LINK}
        >
          Siguiente →
        </Link>
      ) : (
        <span className={DISABLED}>Siguiente →</span>
      )}
    </nav>
  );
}
