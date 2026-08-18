import Link from "next/link";
import type { Metadata } from "next";

import { BusinessForm } from "@/components/business/BusinessForm";
import { requireRole } from "@/lib/auth-guard";

export const metadata: Metadata = {
  title: "Nuevo emprendimiento — ParchU",
};

export default async function NuevoEmprendimientoPage() {
  await requireRole("EMPRENDEDOR");

  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-12">
      <Link href="/panel" className="font-mono text-xs font-bold text-teal">
        ← Volver al panel
      </Link>

      <h1 className="mb-2 mt-4 font-display text-[28px]">
        Registra tu emprendimiento
      </h1>
      <p className="mb-8 text-[14.5px] text-ink/75">
        Queda pendiente de aprobación hasta que el equipo de ParchU lo revise.
      </p>

      <BusinessForm />
    </main>
  );
}
