import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";
import type { LoginInput, RegisterInput } from "@/lib/validations/auth";

// Autenticación con Supabase Auth. El hash de contraseña y la sesión los
// administra Auth; ya no usamos argon2 ni JWE propio. El perfil (profiles) lo
// crea el trigger on_auth_user_created, que fuerza el rol EMPRENDEDOR.
//
// La verificación de correo está HABILITADA: signUp no inicia sesión hasta que
// el usuario confirma el enlace. El callback vive en /auth/confirm.

export type AuthUser = {
  id: string;
  role: Role;
};

export type RegisterOutcome =
  | { ok: true; emailConfirmationRequired: boolean }
  | { ok: false; reason: "SIGNUP_FAILED" };

export type LoginResult =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "INVALID" | "EMAIL_NOT_CONFIRMED" };

export async function registerEmprendedor(
  input: RegisterInput,
  emailRedirectTo: string,
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
      emailRedirectTo,
    },
  });

  if (error || !data.user) {
    return { ok: false, reason: "SIGNUP_FAILED" };
  }

  // Con "Confirm email" activo, signUp NO crea sesión (data.session === null):
  // hay que confirmar el correo. Con protección anti-enumeración, un correo ya
  // registrado devuelve una respuesta indistinguible, así que mostramos el
  // mismo mensaje "revisá tu correo" sin revelar si la cuenta existe.
  const emailConfirmationRequired = data.session === null;

  return { ok: true, emailConfirmationRequired };
}

// Devuelve INVALID tanto si el correo no existe como si la contraseña es
// incorrecta (Auth no los distingue). EMAIL_NOT_CONFIRMED es un caso aparte
// para poder guiar al usuario a confirmar su correo.
export async function login(input: LoginInput): Promise<LoginResult> {
  const sb = await createClient();

  const { data, error } = await sb.auth.signInWithPassword({
    email: input.email.toLowerCase(),
    password: input.password,
  });

  if (error) {
    if (error.code === "email_not_confirmed") {
      return { ok: false, reason: "EMAIL_NOT_CONFIRMED" };
    }
    return { ok: false, reason: "INVALID" };
  }

  if (!data.user) {
    return { ok: false, reason: "INVALID" };
  }

  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  return { ok: true, user: { id: data.user.id, role: profile?.role ?? "EMPRENDEDOR" } };
}
