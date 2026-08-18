import Link from "next/link";
import type { Metadata } from "next";

import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata: Metadata = {
  title: "Crear cuenta — ParchU",
};

export default function RegistroPage() {
  return (
    <>
      <h1 className="mb-2 font-display text-[28px]">Crea tu cuenta</h1>
      <p className="mb-6 text-[14.5px] text-ink/75">
        Regístrate para publicar tu emprendimiento en el tablero.
      </p>

      <RegisterForm />

      <p className="mt-6 text-[13.5px] text-ink/75">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-teal underline">
          Inicia sesión
        </Link>
      </p>
    </>
  );
}
