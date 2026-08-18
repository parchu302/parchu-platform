import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { login, registerEmprendedor } from "@/services/auth-service";

const EMAIL = "ana.auth-service@uni.edu";
const PASSWORD = "ClaveSegura1";

const BASE_INPUT = {
  firstName: "Ana",
  lastName: "Perez",
  email: EMAIL,
  password: PASSWORD,
};

async function cleanup() {
  await db.user.deleteMany({ where: { email: { contains: "auth-service" } } });
}

beforeEach(cleanup);
afterEach(cleanup);

describe("auth-service (Gherkin 0.1)", () => {
  // Escenario: Registro exitoso de un emprendedor
  it("crea la cuenta con rol EMPRENDEDOR y no guarda la contrasena en claro", async () => {
    const outcome = await registerEmprendedor(BASE_INPUT);

    expect(outcome.ok).toBe(true);

    const stored = await db.user.findUnique({ where: { email: EMAIL } });
    expect(stored?.role).toBe("EMPRENDEDOR");
    expect(stored?.passwordHash).not.toContain(PASSWORD);
    expect(stored?.passwordHash.startsWith("$argon2id$")).toBe(true);
  });

  // Escenario: Registro rechazado por correo ya registrado
  it("rechaza un correo ya registrado y no crea una segunda cuenta", async () => {
    await registerEmprendedor(BASE_INPUT);

    const outcome = await registerEmprendedor({
      ...BASE_INPUT,
      firstName: "Otra",
    });

    expect(outcome).toEqual({ ok: false, reason: "EMAIL_TAKEN" });
    expect(await db.user.count({ where: { email: EMAIL } })).toBe(1);
  });

  // Escenario: Inicio de sesion exitoso
  it("autentica con las credenciales correctas", async () => {
    await registerEmprendedor(BASE_INPUT);

    const user = await login({ email: EMAIL, password: PASSWORD });

    expect(user?.role).toBe("EMPRENDEDOR");
    expect(user?.id).toBeTruthy();
  });

  // Escenario: Inicio de sesion rechazado por contrasena incorrecta
  it("rechaza una contrasena incorrecta", async () => {
    await registerEmprendedor(BASE_INPUT);

    expect(await login({ email: EMAIL, password: "OtraClave9" })).toBeNull();
  });

  // Escenario: Inicio de sesion rechazado por correo no registrado
  it("rechaza un correo no registrado", async () => {
    expect(
      await login({
        email: "desconocido.auth-service@uni.edu",
        password: PASSWORD,
      }),
    ).toBeNull();
  });

  // El mensaje generico se construye en la Server Action; aqui se verifica que
  // el servicio no permita distinguir ambos casos: los dos devuelven null.
  it("no distingue entre correo inexistente y contrasena incorrecta", async () => {
    await registerEmprendedor(BASE_INPUT);

    const wrongPassword = await login({ email: EMAIL, password: "OtraClave9" });
    const unknownEmail = await login({
      email: "desconocido.auth-service@uni.edu",
      password: PASSWORD,
    });

    expect(wrongPassword).toBeNull();
    expect(unknownEmail).toBeNull();
  });

  it("permite iniciar sesion sin importar mayusculas en el correo", async () => {
    await registerEmprendedor(BASE_INPUT);

    expect(
      await login({ email: EMAIL.toUpperCase(), password: PASSWORD }),
    ).not.toBeNull();
  });
});
