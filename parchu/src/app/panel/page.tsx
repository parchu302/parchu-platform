import type { Metadata } from "next";

import { LogoutButton } from "@/components/auth/LogoutButton";
import { requireRole } from "@/lib/auth-guard";

export const metadata: Metadata = {
  title: "Panel — ParchU",
};

export default async function PanelPage() {
  // Autorizacion real (el proxy solo hizo un chequeo optimista de la cookie).
  await requireRole("EMPRENDEDOR");

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <div className="mb-8 flex items-center justify-between border-b-2 border-dashed border-line pb-5">
        <h1 className="font-display text-[28px]">Tu panel</h1>
        <LogoutButton />
      </div>

      <div className="rounded-lg border-2 border-ink bg-paper-2 p-8">
        <p className="text-[15px]">
          Tu cuenta está activa. Ya puedes continuar registrando tu
          emprendimiento.
        </p>
        <p className="mt-3 text-[13.5px] text-ink/65">
          El registro de emprendimientos se habilita en la siguiente entrega.
        </p>
      </div>
    </main>
  );
}
