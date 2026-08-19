import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { decryptConfirmationCode, verifyConfirmationCode } from "@/lib/confirmation-code";
import { hashPassword } from "@/lib/password";
import { createGuestOrder } from "@/services/order-service";

const MARKER = "fase5";

const CHECKOUT = {
  guestName: "Cliente Invitado",
  guestContact: "cliente@uni.edu",
  paymentMethodId: "",
};

let businessId: string;
let otherBusinessId: string;
let paymentMethodId: string;
let otherPaymentMethodId: string;

async function cleanup() {
  await db.orderItem.deleteMany({
    where: { order: { business: { name: { contains: MARKER } } } },
  });
  await db.order.deleteMany({
    where: { business: { name: { contains: MARKER } } },
  });
  await db.product.deleteMany({
    where: { business: { name: { contains: MARKER } } },
  });
  await db.paymentMethod.deleteMany({
    where: { business: { name: { contains: MARKER } } },
  });
  await db.business.deleteMany({ where: { name: { contains: MARKER } } });
  await db.user.deleteMany({ where: { email: { contains: MARKER } } });
}

async function createBusiness(suffix: string) {
  const owner = await db.user.create({
    data: {
      email: `dueno${suffix}.${MARKER}@uni.edu`,
      passwordHash: await hashPassword("ClaveSegura1"),
      firstName: "Dueño",
      role: "EMPRENDEDOR",
    },
    select: { id: true },
  });

  const business = await db.business.create({
    data: {
      ownerId: owner.id,
      name: `Negocio${suffix} ${MARKER}`,
      description: "d",
      category: "Comida",
      contactInfo: "c",
      status: "APROBADO",
    },
    select: { id: true },
  });

  const method = await db.paymentMethod.create({
    data: { businessId: business.id, type: "EFECTIVO", details: {} },
    select: { id: true },
  });

  return { businessId: business.id, paymentMethodId: method.id };
}

async function createProduct(owner: string, price: number, stock: number) {
  const product = await db.product.create({
    data: {
      businessId: owner,
      name: `Producto ${stock}-${price} ${MARKER}`,
      price,
      category: "Comida",
      stock,
    },
    select: { id: true },
  });
  return product.id;
}

beforeEach(async () => {
  await cleanup();
  const main = await createBusiness("A");
  const other = await createBusiness("B");
  businessId = main.businessId;
  paymentMethodId = main.paymentMethodId;
  otherBusinessId = other.businessId;
  otherPaymentMethodId = other.paymentMethodId;
});

afterEach(cleanup);

describe("createGuestOrder (Gherkin 0.3)", () => {
  it("crea el pedido en PENDIENTE, descuenta stock y calcula el total con precios de la base", async () => {
    const productId = await createProduct(businessId, 6000, 10);

    const outcome = await createGuestOrder([{ productId, quantity: 3 }], {
      ...CHECKOUT,
      paymentMethodId,
    });

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    expect(outcome.order.status).toBe("PENDIENTE");
    expect(Number(outcome.order.total)).toBe(18000);

    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(7);
  });

  it("guarda el precio unitario como instantánea de la compra", async () => {
    const productId = await createProduct(businessId, 6000, 10);

    const outcome = await createGuestOrder([{ productId, quantity: 2 }], {
      ...CHECKOUT,
      paymentMethodId,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    // El emprendedor sube el precio DESPUÉS de la compra.
    await db.product.update({ where: { id: productId }, data: { price: 9999 } });

    const item = await db.orderItem.findFirst({
      where: { orderId: outcome.order.id },
    });

    expect(Number(item?.unitPrice)).toBe(6000);
    expect(Number(item?.subtotal)).toBe(12000);
  });

  it("guarda el código hasheado y cifrado, nunca en claro", async () => {
    const productId = await createProduct(businessId, 5000, 5);

    const outcome = await createGuestOrder([{ productId, quantity: 1 }], {
      ...CHECKOUT,
      paymentMethodId,
    });
    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;

    const stored = await db.order.findUnique({
      where: { id: outcome.order.id },
    });

    // Ni el hash ni el cifrado contienen el código legible.
    expect(stored?.confirmationCodeHash).not.toContain(outcome.confirmationCode);
    expect(stored?.confirmationCodeEncrypted).not.toContain(
      outcome.confirmationCode,
    );

    // Pero ambos representan el mismo código.
    expect(
      verifyConfirmationCode(stored!.confirmationCodeHash, outcome.confirmationCode),
    ).toBe(true);
    expect(decryptConfirmationCode(stored!.confirmationCodeEncrypted)).toBe(
      outcome.confirmationCode,
    );
  });

  // Escenario: Compra rechazada por falta de stock
  it("rechaza la compra sin stock suficiente y no toca el inventario", async () => {
    const productId = await createProduct(businessId, 6000, 1);

    const outcome = await createGuestOrder([{ productId, quantity: 2 }], {
      ...CHECKOUT,
      paymentMethodId,
    });

    expect(outcome.ok).toBe(false);
    if (outcome.ok) return;
    expect(outcome.reason).toBe("INSUFFICIENT_STOCK");

    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(1);
    expect(await db.order.count({ where: { businessId } })).toBe(0);
  });

  // El punto de mayor riesgo técnico de la fase.
  it("ante dos compras simultáneas del último artículo, solo una prospera", async () => {
    const productId = await createProduct(businessId, 6000, 1);

    const [first, second] = await Promise.all([
      createGuestOrder([{ productId, quantity: 1 }], {
        ...CHECKOUT,
        paymentMethodId,
      }),
      createGuestOrder([{ productId, quantity: 1 }], {
        ...CHECKOUT,
        paymentMethodId,
      }),
    ]);

    const succeeded = [first, second].filter((outcome) => outcome.ok);
    expect(succeeded).toHaveLength(1);

    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(0);
    // Nunca negativo: es la garantía que da el descuento condicional.
    expect(product!.stock).toBeGreaterThanOrEqual(0);
    expect(await db.order.count({ where: { businessId } })).toBe(1);
  });

  it("con 8 compradores simultáneos y stock 3, prosperan exactamente 3", async () => {
    const productId = await createProduct(businessId, 6000, 3);

    const outcomes = await Promise.all(
      Array.from({ length: 8 }, () =>
        createGuestOrder([{ productId, quantity: 1 }], {
          ...CHECKOUT,
          paymentMethodId,
        }),
      ),
    );

    expect(outcomes.filter((outcome) => outcome.ok)).toHaveLength(3);

    const product = await db.product.findUnique({ where: { id: productId } });
    expect(product?.stock).toBe(0);
    expect(await db.order.count({ where: { businessId } })).toBe(3);
  });

  it("revierte los descuentos previos si un ítem posterior no tiene stock", async () => {
    const conStock = await createProduct(businessId, 6000, 10);
    const sinStock = await createProduct(businessId, 7000, 0);

    const outcome = await createGuestOrder(
      [
        { productId: conStock, quantity: 2 },
        { productId: sinStock, quantity: 1 },
      ],
      { ...CHECKOUT, paymentMethodId },
    );

    expect(outcome.ok).toBe(false);

    // El primer producto NO quedó descontado.
    const product = await db.product.findUnique({ where: { id: conStock } });
    expect(product?.stock).toBe(10);
  });

  it("rechaza una forma de pago de otro emprendimiento", async () => {
    const productId = await createProduct(businessId, 6000, 10);

    const outcome = await createGuestOrder([{ productId, quantity: 1 }], {
      ...CHECKOUT,
      paymentMethodId: otherPaymentMethodId,
    });

    expect(outcome).toMatchObject({
      ok: false,
      reason: "PAYMENT_METHOD_INVALID",
    });
  });

  it("rechaza un carrito con productos de dos emprendimientos", async () => {
    const productA = await createProduct(businessId, 6000, 10);
    const productB = await createProduct(otherBusinessId, 6000, 10);

    const outcome = await createGuestOrder(
      [
        { productId: productA, quantity: 1 },
        { productId: productB, quantity: 1 },
      ],
      { ...CHECKOUT, paymentMethodId },
    );

    expect(outcome).toMatchObject({
      ok: false,
      reason: "MULTIPLE_BUSINESSES",
    });
  });

  it("rechaza productos de un emprendimiento pausado", async () => {
    const productId = await createProduct(businessId, 6000, 10);
    await db.business.update({
      where: { id: businessId },
      data: { status: "PAUSADO" },
    });

    const outcome = await createGuestOrder([{ productId, quantity: 1 }], {
      ...CHECKOUT,
      paymentMethodId,
    });

    expect(outcome).toMatchObject({
      ok: false,
      reason: "PRODUCT_UNAVAILABLE",
    });
  });

  it("rechaza un carrito vacío", async () => {
    expect(
      await createGuestOrder([], { ...CHECKOUT, paymentMethodId }),
    ).toMatchObject({ ok: false, reason: "EMPTY_CART" });
  });
});
