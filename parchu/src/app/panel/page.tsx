import Link from "next/link";
import type { Metadata } from "next";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { StatusBadge } from "@/components/business/StatusBadge";
import { requireRole } from "@/lib/auth-guard";
import { listBusinessesByOwner } from "@/repositories/business-repository";

export const metadata: Metadata = {
  title: "Panel — ParchU",
};

export default async function PanelPage() {
  const session = await requireRole("EMPRENDEDOR");
  const businesses = await listBusinessesByOwner(session.userId);

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <div className="mb-8 flex items-center justify-between border-b-2 border-dashed border-line pb-5">
        <h1 className="font-display text-[28px]">Tus emprendimientos</h1>
        <LogoutButton />
      </div>

      {businesses.length === 0 ? (
        <div className="rounded-lg border-2 border-ink bg-paper-2 p-8">
          <p className="text-[15px]">
            Tu cuenta está activa. Ya puedes continuar registrando tu
            emprendimiento.
          </p>
          <Link
            href="/panel/nuevo"
            className="mt-5 inline-block rounded-[3px] border-2 border-ink bg-ink px-[26px] py-[15px] text-[15.5px] font-bold text-paper no-underline"
          >
            Registrar mi emprendimiento
          </Link>
        </div>
      ) : (
        <>
          <ul className="grid list-none grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-6 p-0">
            {businesses.map((business) => (
              <li
                key={business.id}
                data-business-name={business.name}
                className="rounded border-2 border-ink bg-paper-2 p-6"
              >
                <StatusBadge status={business.status} />
                <h2 className="mb-1.5 mt-3 font-display text-[19px]">
                  {business.name}
                </h2>
                <p className="mb-4 text-[13.5px] text-ink/75">
                  {business.description}
                </p>
                <Link
                  href={`/panel/${business.id}`}
                  className="font-mono text-xs font-bold text-teal"
                >
                  Administrar →
                </Link>
              </li>
            ))}
          </ul>

          <Link
            href="/panel/nuevo"
            className="mt-8 inline-block rounded-[3px] border-2 border-ink bg-transparent px-[26px] py-[15px] text-[15.5px] font-bold text-ink no-underline"
          >
            Registrar otro emprendimiento
          </Link>
        </>
      )}
    </main>
  );
}
