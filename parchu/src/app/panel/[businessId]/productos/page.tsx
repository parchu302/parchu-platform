import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { ProductForm } from "@/components/catalog/ProductForm";
import { NotApprovedNotice } from "@/components/catalog/NotApprovedNotice";
import { requireRole } from "@/lib/auth-guard";
import { formatPrice } from "@/lib/format";
import { listProductsByBusiness } from "@/repositories/product-repository";
import { requireApprovedBusiness } from "@/services/business-service";

export const metadata: Metadata = {
  title: "Productos — ParchU",
};

export default async function ProductosPage({
  params,
}: PageProps<"/panel/[businessId]/productos">) {
  const session = await requireRole("EMPRENDEDOR");
  const { businessId } = await params;

  const access = await requireApprovedBusiness(businessId, session.userId);

  if (!access.ok) {
    if (access.reason === "NOT_FOUND") notFound();
    // El emprendimiento existe y es suyo, pero no esta aprobado: se le impide
    // el acceso al formulario y se le explica por que.
    return <NotApprovedNotice what="productos" />;
  }

  const products = await listProductsByBusiness(businessId);

  return (
    <div className="grid gap-8">
      <section className="rounded-lg border-2 border-ink bg-paper-2 p-8">
        <h2 className="mb-5 font-display text-[20px]">Nuevo producto</h2>
        <ProductForm businessId={businessId} />
      </section>

      <section>
        <h2 className="mb-4 font-display text-[20px]">
          Publicados ({products.length})
        </h2>

        {products.length === 0 ? (
          <p className="text-[14.5px] text-ink/70">
            Todavía no has publicado productos.
          </p>
        ) : (
          <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-5 p-0">
            {products.map((product) => (
              <li
                key={product.id}
                data-product-name={product.name}
                className="rounded border-2 border-ink bg-paper p-5"
              >
                {product.imageBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={product.imageBase64}
                    alt={product.name}
                    className="mb-3 h-32 w-full rounded border-2 border-ink object-cover"
                  />
                ) : null}
                <div className="font-mono text-[11px] font-bold uppercase tracking-[.08em] text-teal">
                  {product.category}
                </div>
                <h3 className="mb-1 mt-2 font-display text-[17px]">
                  {product.name}
                </h3>
                {product.description ? (
                  <p className="mb-3 text-[13.5px] text-ink/75">
                    {product.description}
                  </p>
                ) : null}
                <p className="m-0 font-mono text-[14px] font-bold text-coral">
                  {formatPrice(product.price)}
                </p>
                <p className="m-0 mt-1 text-[12.5px] text-ink/65">
                  Stock: {product.stock}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
