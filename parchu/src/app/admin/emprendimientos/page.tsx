import Link from "next/link";
import type { Metadata } from "next";

import { BusinessAdminRow } from "@/components/admin/BusinessAdminRow";
import { requireRole } from "@/lib/auth-guard";
import { listAllBusinesses } from "@/repositories/business-repository";

export const metadata: Metadata = {
  title: "Emprendimientos — ParchU",
};

export default async function AdminBusinessesPage() {
  await requireRole("ADMIN");

  const businesses = await listAllBusinesses();

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <Link href="/admin" className="font-mono text-xs font-bold text-teal">
        ← Panel de administración
      </Link>

      <h1 className="mb-8 mt-4 font-display text-[28px]">Emprendimientos</h1>

      {businesses.length === 0 ? (
        <p className="text-[14.5px] text-ink/70">
          Todavía no hay emprendimientos registrados.
        </p>
      ) : (
        <ul className="grid list-none gap-6 p-0">
          {businesses.map((business) => (
            <BusinessAdminRow
              key={business.id}
              id={business.id}
              name={business.name}
              category={business.category}
              status={business.status}
              ownerEmail={business.owner.email}
            />
          ))}
        </ul>
      )}
    </main>
  );
}
