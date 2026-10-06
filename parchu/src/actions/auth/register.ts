"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";

import { readField } from "@/lib/form-data";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { registerSchema } from "@/lib/validations/auth";
import { registerEmprendedor } from "@/services/auth-service";
import { type AuthFormState } from "./types";

// Por IP: limita la creacion masiva de cuentas. Generoso por la misma razon
// que el login: muchos estudiantes de un mismo edificio comparten IP publica,
// y en semana de bienvenida muchos podrian registrarse a la vez legitimamente.
const IP_LIMIT = { limit: 100, windowMs: 60 * 60_000 };

const CHECK_EMAIL_MESSAGE =
  "Te enviamos un enlace de confirmación a tu correo. Revisá tu bandeja (y la carpeta de spam) para activar la cuenta.";

async function getOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
}

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const ip = await getRequestIp();
  const rate = await checkRateLimit(`register:ip:${ip}`, IP_LIMIT);

  if (!rate.allowed) {
    return {
      status: "error",
      message: "Demasiados registros desde tu conexión. Intenta más tarde.",
    };
  }

  const parsed = registerSchema.safeParse({
    firstName: readField(formData, "firstName"),
    lastName: readField(formData, "lastName"),
    email: readField(formData, "email"),
    password: readField(formData, "password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos del formulario.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const origin = await getOrigin();
  const outcome = await registerEmprendedor(
    parsed.data,
    `${origin}/auth/confirm`,
  );

  if (!outcome.ok) {
    return {
      status: "error",
      message: "No pudimos crear la cuenta. Intentá de nuevo en un momento.",
    };
  }

  // Con verificación de correo activa, no hay sesión aún: se avisa que revise
  // su bandeja. El enlace del correo cae en /auth/confirm y de ahí a /panel.
  if (outcome.emailConfirmationRequired) {
    return { status: "success", message: CHECK_EMAIL_MESSAGE };
  }

  // redirect lanza una excepcion de control de flujo: nada despues se ejecuta,
  // por eso va fuera de cualquier try/catch.
  redirect("/panel");
}
