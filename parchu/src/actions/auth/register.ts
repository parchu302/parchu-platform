"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { readField } from "@/lib/form-data";
import { createSessionCookie } from "@/lib/session-cookie";
import { registerSchema } from "@/lib/validations/auth";
import { registerEmprendedor } from "@/services/auth-service";
import { type AuthFormState } from "./types";

export async function registerAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
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
