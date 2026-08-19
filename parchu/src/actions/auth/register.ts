"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { readField } from "@/lib/form-data";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { createSessionCookie } from "@/lib/session-cookie";
import { registerSchema } from "@/lib/validations/auth";
import { registerEmprendedor } from "@/services/auth-service";
import { type AuthFormState } from "./types";

// Por IP: limita la creacion masiva de cuentas. Generoso por la misma razon
// que el login: muchos estudiantes de un mismo edificio comparten IP publica,
// y en semana de bienvenida muchos podrian registrarse a la vez legitimamente.
const IP_LIMIT = { limit: 100, windowMs: 60 * 60_000 };

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

  const outcome = await registerEmprendedor(parsed.data);

  if (!outcome.ok) {
    return {
      status: "error",
      message: "",
      errors: { email: ["Ese correo ya está en uso"] },
    };
  }

  await createSessionCookie({
    userId: outcome.user.id,
    role: outcome.user.role,
  });

  // redirect lanza una excepcion de control de flujo: nada despues se ejecuta,
  // por eso va fuera de cualquier try/catch.
  redirect("/panel");
}
