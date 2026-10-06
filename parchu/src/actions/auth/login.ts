"use server";

import { redirect } from "next/navigation";

import { readField } from "@/lib/form-data";
import { checkRateLimit } from "@/lib/rate-limit";
import { getRequestIp } from "@/lib/request-ip";
import { loginSchema } from "@/lib/validations/auth";
import { login } from "@/services/auth-service";
import { type AuthFormState } from "./types";

// Mensaje unico para credenciales incorrectas y correo inexistente: no debe
// poder deducirse si una cuenta existe.
const INVALID_CREDENTIALS = "Credenciales inválidas";
const EMAIL_NOT_CONFIRMED_MESSAGE =
  "Confirmá tu correo para entrar. Te enviamos un enlace al registrarte (revisá spam).";
const RATE_LIMITED_MESSAGE =
  "Demasiados intentos. Espera unos minutos e intenta de nuevo.";

// El limite por correo es el control real contra probar contraseñas sobre una
// cuenta puntual. El de IP es solo un piso contra flood de bots: ParchU es un
// marketplace universitario, y muchos estudiantes comparten la misma IP
// publica tras el NAT del campus, asi que debe ser generoso para no bloquear
// trafico legitimo de un mismo edificio/residencia.
const IP_LIMIT = { limit: 200, windowMs: 5 * 60_000 };
const EMAIL_LIMIT = { limit: 5, windowMs: 5 * 60_000 };

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

  const ip = await getRequestIp();
  const [byIp, byEmail] = await Promise.all([
    checkRateLimit(`login:ip:${ip}`, IP_LIMIT),
    checkRateLimit(`login:email:${parsed.data.email}`, EMAIL_LIMIT),
  ]);

  if (!byIp.allowed || !byEmail.allowed) {
    return { status: "error", message: RATE_LIMITED_MESSAGE };
  }

  const result = await login(parsed.data);

  if (!result.ok) {
    return {
      status: "error",
      message:
        result.reason === "EMAIL_NOT_CONFIRMED"
          ? EMAIL_NOT_CONFIRMED_MESSAGE
          : INVALID_CREDENTIALS,
    };
  }

  // signInWithPassword ya dejó la sesión en cookies (cliente SSR).
  redirect(result.user.role === "ADMIN" ? "/admin" : "/panel");
}
