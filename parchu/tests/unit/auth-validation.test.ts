import { describe, expect, it } from "vitest";
import { z } from "zod";

import { registerSchema } from "@/lib/validations/auth";

function firstError(input: unknown, field: string): string | undefined {
  const result = registerSchema.safeParse(input);
  if (result.success) return undefined;
  return z.flattenError(result.error).fieldErrors[
    field as keyof ReturnType<typeof z.flattenError>["fieldErrors"]
  ]?.[0];
}

const VALID = {
  firstName: "Ana",
  lastName: "Perez",
  email: "ana@uni.edu",
  password: "ClaveSegura1",
};

describe("registerSchema (Gherkin 0.1)", () => {
  it("acepta un registro valido y normaliza el correo a minusculas", () => {
    const result = registerSchema.safeParse({ ...VALID, email: "ANA@Uni.Edu" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.email).toBe("ana@uni.edu");
  });

  // Escenario: Registro rechazado por formato de correo invalido
  it('rechaza el correo "ana@invalido" por formato', () => {
    expect(firstError({ ...VALID, email: "ana@invalido" }, "email")).toBe(
      "El formato del correo es inválido",
    );
  });

  // Escenario: Registro rechazado por contrasena insegura
  it.each([
    ["corta", "Abc1"],
    ["sin mayuscula", "clavesegura1"],
    ["sin numero", "ClaveSegura"],
  ])("rechaza una contrasena %s", (_caso, password) => {
    const result = registerSchema.safeParse({ ...VALID, password });
    expect(result.success).toBe(false);
  });

  // Esquema del escenario: campos obligatorios faltantes
  it.each([
    ["correo", "email", "El correo es obligatorio"],
    ["contraseña", "password", "La contraseña es obligatoria"],
    ["nombre", "firstName", "El nombre es obligatorio"],
  ])(
    'indica que el campo "%s" es obligatorio cuando viene vacio',
    (_campo, field, expected) => {
      expect(firstError({ ...VALID, [field]: "" }, field)).toBe(expected);
    },
  );

  it("acepta que el apellido venga vacio (no es obligatorio)", () => {
    const result = registerSchema.safeParse({ ...VALID, lastName: "" });
    expect(result.success).toBe(true);
  });
});
