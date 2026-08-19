import { AddToCartButton } from "@/components/checkout/AddToCartButton";
import { formatPrice } from "@/lib/format";
import type { CatalogProduct } from "@/repositories/catalog-repository";

export function ProductCard({ product }: { product: CatalogProduct }) {
  return (
    <li
      data-product-name={product.name}
      data-product-category={product.category}
      className="relative border-[1.5px] border-line bg-[#FAF6EC] px-[18px] pb-[22px] pt-5 shadow-[3px_5px_10px_rgba(43,33,24,.15)]"
    >
      <div className="font-mono text-[11px] font-bold uppercase tracking-[.08em] text-teal">
        {product.category}
      </div>
      <h3 className="mb-1.5 mt-2 font-display text-[17px]">{product.name}</h3>
      {product.description ? (
        <p className="mb-3 text-[13.5px] text-ink/78">{product.description}</p>
      ) : null}
      <p className="m-0 mb-3 text-[12.5px] text-ink/65">
        {product.businessName}
      </p>
      <span className="inline-block -rotate-2 bg-coral px-2.5 py-1 font-mono text-[13.5px] font-bold text-white">
        {formatPrice(product.price)}
      </span>

      <AddToCartButton productId={product.id} disabled={product.stock <= 0} />
    </li>
  );
}
