import Link from "next/link";
import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/LoginForm";

export const metadata: Metadata = {
  title: "Iniciar sesión — ParchU",
};

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-2 font-display text-[28px]">Iniciar sesión</h1>
      <p className="mb-6 text-[14.5px] text-ink/75">
        Entra para administrar tus emprendimientos y pedidos.
      </p>

      <LoginForm />

      <p className="mt-6 text-[13.5px] text-ink/75">
        ¿Aún no tienes cuenta?{" "}
        <Link href="/registro" className="font-semibold text-teal underline">
          Regístrate
        </Link>
      </p>
    </>
  );
}
