import { Prisma, type Role } from "@prisma/client";

import { hashPassword, verifyPassword } from "@/lib/password";
import type { LoginInput, RegisterInput } from "@/lib/validations/auth";
import { createUser, findUserByEmail } from "@/repositories/user-repository";

export type AuthUser = {
  id: string;
  role: Role;
};

export type RegisterOutcome =
  | { ok: true; user: AuthUser }
  | { ok: false; reason: "EMAIL_TAKEN" };

// Hash señuelo: cuando el correo no existe se verifica igual contra el, para
// que el tiempo de respuesta no revele si la cuenta existe.
let decoyHashPromise: Promise<string> | null = null;
function getDecoyHash(): Promise<string> {
  decoyHashPromise ??= hashPassword("contrasena-senuelo-sin-uso-real");
  return decoyHashPromise;
}

function isUniqueEmailViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function registerEmprendedor(
  input: RegisterInput,
): Promise<RegisterOutcome> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    return { ok: false, reason: "EMAIL_TAKEN" };
  }

  const passwordHash = await hashPassword(input.password);

  try {
    const user = await createUser({
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: "EMPRENDEDOR",
    });

    return { ok: true, user };
  } catch (error) {
    // Dos registros simultaneos con el mismo correo: el indice unico decide.
    if (isUniqueEmailViolation(error)) {
      return { ok: false, reason: "EMAIL_TAKEN" };
    }
    throw error;
  }
}

// Devuelve null tanto si el correo no existe como si la contrasena es
// incorrecta: quien llama no puede distinguir los dos casos.
export async function login(input: LoginInput): Promise<AuthUser | null> {
  const user = await findUserByEmail(input.email);

  if (!user) {
    await verifyPassword(await getDecoyHash(), input.password);
    return null;
  }

  const passwordMatches = await verifyPassword(
    user.passwordHash,
    input.password,
  );
  if (!passwordMatches) {
    return null;
  }

  return { id: user.id, role: user.role };
}
