import Link from "next/link";

import { formatPrice } from "@/lib/format";
import {
  findTopSellingProducts,
  listPublicCategories,
} from "@/repositories/catalog-repository";

const FEATURED_LIMIT = 6;

// Server Component: el tablero ya no usa datos de ejemplo, muestra los
// productos mas vendidos reales y lleva al catalogo completo.
export async function FeaturedBoard() {
  const [products, categories] = await Promise.all([
    findTopSellingProducts(FEATURED_LIMIT),
    listPublicCategories(),
  ]);

  if (products.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-line p-8 text-[15px] text-ink/70">
        Todavía no hay productos publicados. Si vendes algo en el campus,{" "}
        <Link href="#unirme" className="font-semibold text-teal underline">
          súmate al tablero
        </Link>
        .
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/productos"
          className="rounded-[20px] border-2 border-teal bg-teal px-4 py-2 font-mono text-[13px] font-semibold text-paper no-underline"
        >
          Todos
        </Link>
        {categories.map((category) => (
          <Link
            key={category}
            href={`/productos?categoria=${encodeURIComponent(category)}`}
            className="rounded-[20px] border-2 border-ink bg-paper px-4 py-2 font-mono text-[13px] font-semibold text-ink no-underline hover:bg-paper-2"
          >
            {category}
          </Link>
        ))}
      </div>

      <ul className="mt-11 grid list-none grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-[26px] p-0">
        {products.map((product, index) => (
          <li
            key={product.id}
            data-product-name={product.name}
            className={`relative border-[1.5px] border-line bg-[#FAF6EC] px-[18px] pb-[22px] pt-5 shadow-[3px_5px_10px_rgba(43,33,24,.15)] transition-transform duration-150 before:absolute before:-top-2 before:left-1/2 before:h-4 before:w-[46px] before:-translate-x-1/2 before:-rotate-3 before:bg-mustard/75 before:content-[''] hover:rotate-0 hover:-translate-y-[5px] ${
              index % 2 === 0 ? "-rotate-[1.4deg]" : "rotate-[1.2deg]"
            }`}
          >
            <div className="font-mono text-[11px] font-bold uppercase tracking-[.08em] text-teal">
              {product.category}
            </div>
            <h3 className="mb-1.5 mt-2 font-display text-[17px]">
              {product.name}
            </h3>
            {product.description ? (
              <p className="mb-3 text-[13.5px] text-ink/78">
                {product.description}
              </p>
            ) : null}
            <p className="m-0 mb-3 text-[12.5px] text-ink/65">
              {product.businessName}
            </p>
            <span className="inline-block -rotate-2 bg-coral px-2.5 py-1 font-mono text-[13.5px] font-bold text-white">
              {formatPrice(product.price)}
            </span>
          </li>
        ))}
      </ul>

      <Link
        href="/productos"
        className="mt-10 inline-block rounded-[3px] border-2 border-ink bg-transparent px-[26px] py-[15px] text-[15.5px] font-bold text-ink no-underline"
      >
        Ver todo el tablero →
      </Link>
    </>
  );
}
