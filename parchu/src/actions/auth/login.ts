"use server";

import { redirect } from "next/navigation";

import { readField } from "@/lib/form-data";
import { createSessionCookie } from "@/lib/session-cookie";
import { loginSchema } from "@/lib/validations/auth";
import { login } from "@/services/auth-service";
import { type AuthFormState } from "./types";

// Mensaje unico para credenciales incorrectas y correo inexistente: no debe
// poder deducirse si una cuenta existe.
const INVALID_CREDENTIALS = "Credenciales inválidas";

export async function loginAction(
  _prevState: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: readField(formData, "email"),
    password: readField(formData, "password"),
  });

  if (!parsed.success) {
    return { status: "error", message: INVALID_CREDENTIALS };
  }

  const user = await login(parsed.data);

  if (!user) {
    return { status: "error", message: INVALID_CREDENTIALS };
  }

  await createSessionCookie({ userId: user.id, role: user.role });

  redirect(user.role === "ADMIN" ? "/admin" : "/panel");
}
