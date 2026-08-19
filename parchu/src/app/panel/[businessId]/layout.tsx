import Link from "next/link";
import { notFound } from "next/navigation";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { StatusBadge } from "@/components/business/StatusBadge";
import { requireRole } from "@/lib/auth-guard";
import {
  findBusinessById,
  listBusinessesByOwner,
} from "@/repositories/business-repository";

// Valida la propiedad del emprendimiento y expone el activo a las rutas hijas
// (productos y pedidos en las fases siguientes).
export default async function BusinessLayout({
  children,
  params,
}: LayoutProps<"/panel/[businessId]">) {
  const session = await requireRole("EMPRENDEDOR");
  const { businessId } = await params;

  const business = await findBusinessById(businessId);

  // Mismo resultado para "no existe" y "es de otro emprendedor": no se revela
  // la existencia de emprendimientos ajenos.
  if (!business || business.ownerId !== session.userId) {
    notFound();
  }

  const businesses = await listBusinessesByOwner(session.userId);

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b-2 border-dashed border-line pb-5">
        <div>
          <Link href="/panel" className="font-mono text-xs font-bold text-teal">
            ← Tus emprendimientos
          </Link>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="font-display text-[28px]">{business.name}</h1>
            <StatusBadge status={business.status} />
          </div>
        </div>
        <LogoutButton />
      </div>

      {businesses.length > 1 ? (
        <nav
          aria-label="Emprendimiento activo"
          className="mb-8 flex flex-wrap gap-2"
        >
          {businesses.map((item) => (
            <Link
              key={item.id}
              href={`/panel/${item.id}`}
              aria-current={item.id === business.id ? "page" : undefined}
              className={`rounded-[20px] border-2 px-4 py-2 font-mono text-[12.5px] font-semibold no-underline ${
                item.id === business.id
                  ? "border-teal bg-teal text-paper"
                  : "border-ink bg-paper text-ink"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      ) : null}

      <nav aria-label="Secciones del emprendimiento" className="mb-8 flex flex-wrap gap-2">
        {[
          { href: `/panel/${business.id}`, label: "Resumen" },
          { href: `/panel/${business.id}/productos`, label: "Productos" },
          { href: `/panel/${business.id}/pagos`, label: "Formas de pago" },
          { href: `/panel/${business.id}/pedidos`, label: "Pedidos" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded border-2 border-ink bg-paper px-4 py-2 font-mono text-[12.5px] font-semibold no-underline"
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {children}
    </main>
  );
}
