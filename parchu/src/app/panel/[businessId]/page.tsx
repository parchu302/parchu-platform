import { requireRole } from "@/lib/auth-guard";
import { findBusinessById } from "@/repositories/business-repository";
import { notFound } from "next/navigation";

export default async function BusinessPage({
  params,
  searchParams,
}: PageProps<"/panel/[businessId]">) {
  const session = await requireRole("EMPRENDEDOR");
  const { businessId } = await params;
  const { creado } = await searchParams;

  const business = await findBusinessById(businessId);
  if (!business || business.ownerId !== session.userId) {
    notFound();
  }

  return (
    <div className="grid gap-6">
      {creado ? (
        <p
          role="status"
          data-testid="business-created"
          className="rounded border-2 border-teal bg-teal/10 px-4 py-3 text-[14px] font-semibold text-teal"
        >
          Tu emprendimiento quedó registrado y está pendiente de aprobación.
        </p>
      ) : null}

      <section className="rounded-lg border-2 border-ink bg-paper-2 p-8">
        <h2 className="mb-3 font-display text-[20px]">Datos</h2>
        <dl className="grid gap-3 text-[14.5px]">
          <div>
            <dt className="font-mono text-[11px] font-bold uppercase tracking-[.08em] text-teal">
              Categoría
            </dt>
            <dd className="m-0">{business.category}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] font-bold uppercase tracking-[.08em] text-teal">
              Descripción
            </dt>
            <dd className="m-0">{business.description}</dd>
          </div>
          <div>
            <dt className="font-mono text-[11px] font-bold uppercase tracking-[.08em] text-teal">
              Contacto
            </dt>
            <dd className="m-0">{business.contactInfo}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-lg border-2 border-dashed border-line p-8 text-[13.5px] text-ink/65">
        Los productos, las formas de pago y los pedidos se habilitan en las
        siguientes entregas.
      </section>
    </div>
  );
}
