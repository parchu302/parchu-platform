import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BusinessStatus } from "@/lib/types";
import { registerPaymentMethod } from "@/services/payment-method-service";
import { registerProduct } from "@/services/product-service";

import {
  businessIds,
  createTestUser,
  deleteTestUsers,
  must,
  sb,
} from "./helpers/supabase";

const MARKER = "fase3";

const PRODUCT = {
  name: "Brownie",
  description: "Con nueces",
  price: 6000,
  category: "Comida",
  stock: 10,
};

let ownerId: string;
let otherOwnerId: string;

async function cleanup() {
  const ids = await businessIds(MARKER);
  if (ids.length > 0) {
    await sb.from("Product").delete().in("businessId", ids);
    await sb.from("PaymentMethod").delete().in("businessId", ids);
    await sb.from("Business").delete().in("id", ids);
  }
  await deleteTestUsers(MARKER);
}

async function createBusiness(status: BusinessStatus, suffix = "") {
  const business = must(
    await sb
      .from("Business")
      .insert({
        ownerId,
        name: `Negocio ${MARKER}${suffix}`,
        description: "descripción",
        category: "Comida",
        contactInfo: "300 000 0000",
        status,
      })
      .select("id")
      .single(),
  );
  return business.id;
}

async function countProducts(businessId: string) {
  const { count } = await sb
    .from("Product")
    .select("*", { count: "exact", head: true })
    .eq("businessId", businessId);
  return count;
}

beforeEach(async () => {
  await cleanup();
  ownerId = await createTestUser(`dueno.${MARKER}@uni.edu`);
  otherOwnerId = await createTestUser(`otro.${MARKER}@uni.edu`);
});

afterEach(cleanup);

// La definición de hecho exige probar el bloqueo como regla de servicio,
// invocándolo directamente sin pasar por la interfaz.
describe("gate de emprendimiento aprobado (Gherkin 2)", () => {
  it("registra el producto cuando el emprendimiento está aprobado", async () => {
    const businessId = await createBusiness("APROBADO");

    const outcome = await registerProduct(businessId, ownerId, PRODUCT);

    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.product.status).toBe("PUBLICADO");
      expect(Number(outcome.product.price)).toBe(6000);
      expect(outcome.product.salesCount).toBe(0);
    }
  });

  it.each(["PENDIENTE", "PAUSADO"] as const)(
    "bloquea el registro de producto si el emprendimiento está %s",
    async (status) => {
      const businessId = await createBusiness(status);

      const outcome = await registerProduct(businessId, ownerId, PRODUCT);

      expect(outcome).toEqual({ ok: false, reason: "NOT_APPROVED" });
      expect(await countProducts(businessId)).toBe(0);
    },
  );

  it("bloquea el registro en un emprendimiento de otro emprendedor", async () => {
    const businessId = await createBusiness("APROBADO");

    const outcome = await registerProduct(businessId, otherOwnerId, PRODUCT);

    expect(outcome).toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(await countProducts(businessId)).toBe(0);
  });

  it("bloquea el registro en un emprendimiento eliminado", async () => {
    const businessId = await createBusiness("APROBADO");
    must(
      await sb
        .from("Business")
        .update({
          deletedAt: new Date().toISOString(),
          deleteReason: "motivo",
        })
        .eq("id", businessId)
        .select()
        .single(),
    );

    expect(await registerProduct(businessId, ownerId, PRODUCT)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });

  it("aplica el mismo bloqueo a las formas de pago", async () => {
    const pendiente = await createBusiness("PENDIENTE", "-a");
    const aprobado = await createBusiness("APROBADO", "-b");
    const input = { type: "NEQUI" as const, details: { telefono: "3001112233" } };

    expect(await registerPaymentMethod(pendiente, ownerId, input)).toEqual({
      ok: false,
      reason: "NOT_APPROVED",
    });

    const outcome = await registerPaymentMethod(aprobado, ownerId, input);
    expect(outcome.ok).toBe(true);
    if (outcome.ok) {
      expect(outcome.paymentMethod.type).toBe("NEQUI");
      expect(outcome.paymentMethod.details).toEqual({ telefono: "3001112233" });
    }
  });
});
