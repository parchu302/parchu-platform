import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import type { LoginInput, RegisterInput } from "@/lib/validations/auth";

// Autenticación con Supabase Auth. El hash de contraseña y la sesión los
// administra Auth; ya no usamos argon2 ni JWE propio. El perfil (profiles) lo
// crea el trigger on_auth_user_created, que fuerza el rol EMPRENDEDOR.

export type AuthUser = {
  id: string;
  role: Role;
};

export type RegisterOutcome =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "EMAIL_TAKEN" };

export async function registerEmprendedor(
  input: RegisterInput,
): Promise<RegisterOutcome> {
  const sb = await createClient();

  const { data, error } = await sb.auth.signUp({
    email: input.email.toLowerCase(),
    password: input.password,
    options: {
      // firstName/lastName viajan en la metadata; el trigger los copia a
      // profiles. El rol NO se toma de aquí (el trigger lo fuerza).
      data: {
        firstName: input.firstName,
        lastName: input.lastName ?? null,
      },
    },
  });

  // Con "Confirm email" deshabilitado, signUp de un correo ya registrado
  // devuelve error -> EMAIL_TAKEN. Al crear exitosamente, también inicia sesión
  // (la cookie la setea el cliente SSR), igual que el flujo anterior.
  if (error || !data.user) {
    return { ok: false, reason: "EMAIL_TAKEN" };
  }

  return { ok: true, user: { id: data.user.id, role: "EMPRENDEDOR" } };
}

// Devuelve null tanto si el correo no existe como si la contraseña es
// incorrecta: Auth no distingue los dos casos hacia el llamador.
export async function login(input: LoginInput): Promise<AuthUser | null> {
  const sb = await createClient();

  const { data, error } = await sb.auth.signInWithPassword({
    email: input.email.toLowerCase(),
    password: input.password,
  });

  if (error || !data.user) {
    return null;
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  return { id: data.user.id, role: profile?.role ?? "EMPRENDEDOR" };
}
