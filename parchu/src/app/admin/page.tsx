import Link from "next/link";
import type { Metadata } from "next";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { requireRole } from "@/lib/auth-guard";
import { countPlatformStats } from "@/repositories/business-repository";

export const metadata: Metadata = {
  title: "Administración — ParchU",
};

export default async function AdminPage() {
  await requireRole("ADMIN");

  const stats = await countPlatformStats();

  const cards = [
    { key: "businesses", label: "Emprendimientos", value: stats.businesses },
    { key: "products", label: "Productos", value: stats.products },
    { key: "orders", label: "Pedidos", value: stats.orders },
    {
      key: "pending",
      label: "Pendientes de aprobación",
      value: stats.pendingBusinesses,
    },
  ];

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <div className="mb-8 flex items-center justify-between border-b-2 border-dashed border-line pb-5">
        <h1 className="font-display text-[28px]">Panel de administración</h1>
        <LogoutButton />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
        {cards.map((card) => (
          <div
            key={card.key}
            data-stat={card.key}
            className="rounded border-2 border-ink bg-paper-2 p-6"
          >
            <div className="font-mono text-[12px] font-bold uppercase tracking-[.08em] text-teal">
              {card.label}
            </div>
            <div data-stat-value className="mt-2 font-display text-[32px]">
              {card.value}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link
          href="/admin/emprendimientos"
          className="inline-block rounded-[3px] border-2 border-ink bg-ink px-[26px] py-[15px] text-[15.5px] font-bold text-paper no-underline"
        >
          Gestionar emprendimientos
        </Link>
        <Link
          href="/admin/pedidos"
          className="inline-block rounded-[3px] border-2 border-ink bg-transparent px-[26px] py-[15px] text-[15.5px] font-bold text-ink no-underline"
        >
          Pedidos bloqueados
        </Link>
      </div>
    </main>
  );
}
