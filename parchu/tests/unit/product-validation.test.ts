import { describe, expect, it } from "vitest";
import { z } from "zod";

import { paymentMethodSchema } from "@/lib/validations/payment-method";
import { productSchema } from "@/lib/validations/product";

const VALID_PRODUCT = {
  name: "Brownie",
  description: "Con nueces",
  price: "6000",
  category: "Comida",
  stock: "10",
};

function productError(overrides: Record<string, string>, field: string) {
  const result = productSchema.safeParse({ ...VALID_PRODUCT, ...overrides });
  if (result.success) return undefined;
  return z.flattenError(result.error).fieldErrors[
    field as "name" | "price" | "category" | "stock"
  ]?.[0];
}

describe("productSchema (Gherkin 2)", () => {
  it("acepta un producto válido y convierte precio y stock", () => {
    const result = productSchema.safeParse(VALID_PRODUCT);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.price).toBe(6000);
      expect(result.data.stock).toBe(10);
    }
  });

  it("acepta que la descripción venga vacía (es el único campo opcional)", () => {
    expect(
      productSchema.safeParse({ ...VALID_PRODUCT, description: "" }).success,
    ).toBe(true);
  });

  // Esquema del escenario: campos obligatorios faltantes
  it.each([
    ["nombre", "name", "El nombre es obligatorio"],
    ["precio", "price", "El precio es obligatorio"],
    ["categoría", "category", "La categoría es obligatoria"],
    ["stock", "stock", "El stock es obligatorio"],
  ])('indica que el campo "%s" es obligatorio', (_campo, field, expected) => {
    expect(productError({ [field]: "" }, field)).toBe(expected);
  });

  // Escenario: precio o stock inválido
  it.each([
    ["precio", "price"],
    ["stock", "stock"],
  ])("rechaza un %s negativo con el mensaje del caso de uso", (_campo, field) => {
    expect(productError({ [field]: "-1" }, field)).toBe(
      "El valor debe ser mayor o igual a cero",
    );
  });

  it("acepta precio y stock en cero", () => {
    expect(
      productSchema.safeParse({ ...VALID_PRODUCT, price: "0", stock: "0" })
        .success,
    ).toBe(true);
  });

  it("rechaza un stock con decimales", () => {
    expect(productError({ stock: "1.5" }, "stock")).toBe(
      "El stock debe ser un número entero",
    );
  });

  it("rechaza un precio no numérico", () => {
    expect(productError({ price: "gratis" }, "price")).toBe(
      "El precio debe ser un número",
    );
  });

  // Escenario: imagen del producto (opcional)
  const VALID_IMAGE_DATA_URL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";

  it("acepta el producto sin la clave image (es opcional)", () => {
    expect(productSchema.safeParse(VALID_PRODUCT).success).toBe(true);
  });

  it("acepta una imagen vacía y la normaliza a undefined", () => {
    const result = productSchema.safeParse({ ...VALID_PRODUCT, image: "" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.image).toBeUndefined();
    }
  });

  it("acepta un data URL de imagen válido", () => {
    const result = productSchema.safeParse({
      ...VALID_PRODUCT,
      image: VALID_IMAGE_DATA_URL,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.image).toBe(VALID_IMAGE_DATA_URL);
    }
  });

  it("rechaza un archivo que no es una imagen válida", () => {
    const result = productSchema.safeParse({
      ...VALID_PRODUCT,
      image: "data:text/plain;base64,aG9sYQ==",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors.image?.[0]).toBe(
        "El archivo debe ser una imagen válida (JPG, PNG o WEBP)",
      );
    }
  });
});

describe("paymentMethodSchema (Gherkin 2)", () => {
  it("acepta efectivo sin datos adicionales", () => {
    const result = paymentMethodSchema.safeParse({ type: "EFECTIVO" });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ type: "EFECTIVO", details: {} });
    }
  });

  it("separa el tipo de sus datos requeridos", () => {
    const result = paymentMethodSchema.safeParse({
      type: "NEQUI",
      telefono: "3001112233",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({
        type: "NEQUI",
        details: { telefono: "3001112233" },
      });
    }
  });

  // Escenario: datos incompletos, especifico por metodo
  it("reporta los datos faltantes de una transferencia", () => {
    const result = paymentMethodSchema.safeParse({
      type: "TRANSFERENCIA",
      banco: "",
      numeroCuenta: "",
      titular: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const errors = z.flattenError(result.error).fieldErrors;
      expect(errors).toHaveProperty("banco");
      expect(errors).toHaveProperty("numeroCuenta");
      expect(errors).toHaveProperty("titular");
    }
  });

  it("reporta el teléfono faltante de Yape/Plin", () => {
    const result = paymentMethodSchema.safeParse({
      type: "YAPE_PLIN",
      telefono: "",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(z.flattenError(result.error).fieldErrors).toHaveProperty(
        "telefono",
      );
    }
  });

  it("rechaza un método de pago no seleccionado", () => {
    expect(paymentMethodSchema.safeParse({ type: "" }).success).toBe(false);
  });
});
