import type { Metadata } from "next";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { requireRole } from "@/lib/auth-guard";

export const metadata: Metadata = {
  title: "Administración — ParchU",
};

// Las estadisticas reales se implementan en la siguiente fase; aqui solo se
// verifica que el administrador aterriza en su panel tras iniciar sesion.
const STAT_LABELS = [
  "Emprendimientos",
  "Productos",
  "Pedidos",
  "Pendientes de aprobación",
];

export default async function AdminPage() {
  await requireRole("ADMIN");

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <div className="mb-8 flex items-center justify-between border-b-2 border-dashed border-line pb-5">
        <h1 className="font-display text-[28px]">Panel de administración</h1>
        <LogoutButton />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-6">
        {STAT_LABELS.map((label) => (
          <div
            key={label}
            className="rounded border-2 border-ink bg-paper-2 p-6"
          >
            <div className="font-mono text-[12px] font-bold uppercase tracking-[.08em] text-teal">
              {label}
            </div>
            <div className="mt-2 font-display text-[32px] text-ink/40">—</div>
          </div>
        ))}
      </div>
    </main>
  );
}
