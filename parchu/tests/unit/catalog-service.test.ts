import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { BusinessStatus } from "@prisma/client";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { registerPaymentMethod } from "@/services/payment-method-service";
import { registerProduct } from "@/services/product-service";

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
  await db.product.deleteMany({
    where: { business: { name: { contains: MARKER } } },
  });
  await db.paymentMethod.deleteMany({
    where: { business: { name: { contains: MARKER } } },
  });
  await db.business.deleteMany({ where: { name: { contains: MARKER } } });
  await db.user.deleteMany({ where: { email: { contains: MARKER } } });
}

async function createOwner(email: string) {
  const user = await db.user.create({
    data: {
      email,
      passwordHash: await hashPassword("ClaveSegura1"),
      firstName: "Ana",
      role: "EMPRENDEDOR",
    },
    select: { id: true },
  });
  return user.id;
}

async function createBusiness(status: BusinessStatus, suffix = "") {
  const business = await db.business.create({
    data: {
      ownerId,
      name: `Negocio ${MARKER}${suffix}`,
      description: "descripción",
      category: "Comida",
      contactInfo: "300 000 0000",
      status,
    },
    select: { id: true },
  });
  return business.id;
}

beforeEach(async () => {
  await cleanup();
  ownerId = await createOwner(`dueno.${MARKER}@uni.edu`);
  otherOwnerId = await createOwner(`otro.${MARKER}@uni.edu`);
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
      expect(await db.product.count({ where: { businessId } })).toBe(0);
    },
  );

  it("bloquea el registro en un emprendimiento de otro emprendedor", async () => {
    const businessId = await createBusiness("APROBADO");

    const outcome = await registerProduct(businessId, otherOwnerId, PRODUCT);

    expect(outcome).toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(await db.product.count({ where: { businessId } })).toBe(0);
  });

  it("bloquea el registro en un emprendimiento eliminado", async () => {
    const businessId = await createBusiness("APROBADO");
    await db.business.update({
      where: { id: businessId },
      data: { deletedAt: new Date(), deleteReason: "motivo" },
    });

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
