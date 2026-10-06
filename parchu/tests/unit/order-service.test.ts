import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { decryptConfirmationCode, verifyConfirmationCode } from "@/lib/confirmation-code";
import { createGuestOrder } from "@/services/order-service";

import {
  businessIds,
  createTestUser,
  deleteTestUsers,
  must,
  sb,
} from "./helpers/supabase";

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
  const ids = await businessIds(MARKER);
  if (ids.length > 0) {
    const { data: orders } = await sb
      .from("Order")
      .select("id")
      .in("businessId", ids);
    const orderIds = (orders ?? []).map((o) => o.id);
    if (orderIds.length > 0) {
      await sb.from("OrderItem").delete().in("orderId", orderIds);
      await sb.from("Order").delete().in("id", orderIds);
    }
    await sb.from("Product").delete().in("businessId", ids);
    await sb.from("PaymentMethod").delete().in("businessId", ids);
    await sb.from("Business").delete().in("id", ids);
  }
  await deleteTestUsers(MARKER);
}

async function createBusiness(suffix: string) {
  const ownerId = await createTestUser(`dueno${suffix}.${MARKER}@uni.edu`, {
    firstName: "Dueño",
  });

  const business = must(
    await sb
      .from("Business")
      .insert({
        ownerId,
        name: `Negocio${suffix} ${MARKER}`,
        description: "d",
        category: "Comida",
        contactInfo: "c",
        status: "APROBADO",
      })
      .select("id")
      .single(),
  );

  const method = must(
    await sb
      .from("PaymentMethod")
      .insert({ businessId: business.id, type: "EFECTIVO", details: {} })
      .select("id")
      .single(),
  );

  return { businessId: business.id, paymentMethodId: method.id };
}

async function createProduct(owner: string, price: number, stock: number) {
  const product = must(
    await sb
      .from("Product")
      .insert({
        businessId: owner,
        name: `Producto ${stock}-${price} ${MARKER}`,
        price,
        category: "Comida",
        stock,
      })
      .select("id")
      .single(),
  );
  return product.id;
}

async function getProduct(id: string) {
  return must(await sb.from("Product").select("*").eq("id", id).single());
}

async function countOrders(businessId: string) {
  const { count } = await sb
    .from("Order")
    .select("*", { count: "exact", head: true })
    .eq("businessId", businessId);
  return count;
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

    const product = await getProduct(productId);
    expect(product.stock).toBe(7);
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
    must(
      await sb.from("Product").update({ price: 9999 }).eq("id", productId).select().single(),
    );

    const { data: item } = await sb
      .from("OrderItem")
      .select("*")
      .eq("orderId", outcome.order.id)
      .limit(1)
      .maybeSingle();

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

    const stored = must(
      await sb.from("Order").select("*").eq("id", outcome.order.id).single(),
    );

    // Ni el hash ni el cifrado contienen el código legible.
    expect(stored.confirmationCodeHash).not.toContain(outcome.confirmationCode);
    expect(stored.confirmationCodeEncrypted).not.toContain(
      outcome.confirmationCode,
    );

    // Pero ambos representan el mismo código.
    expect(
      verifyConfirmationCode(stored.confirmationCodeHash, outcome.confirmationCode),
    ).toBe(true);
    expect(decryptConfirmationCode(stored.confirmationCodeEncrypted)).toBe(
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

    const product = await getProduct(productId);
    expect(product.stock).toBe(1);
    expect(await countOrders(businessId)).toBe(0);
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

    const product = await getProduct(productId);
    expect(product.stock).toBe(0);
    // Nunca negativo: es la garantía que da el descuento condicional.
    expect(product.stock).toBeGreaterThanOrEqual(0);
    expect(await countOrders(businessId)).toBe(1);
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

    const product = await getProduct(productId);
    expect(product.stock).toBe(0);
    expect(await countOrders(businessId)).toBe(3);
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
    const product = await getProduct(conStock);
    expect(product.stock).toBe(10);
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
    must(
      await sb
        .from("Business")
        .update({ status: "PAUSADO" })
        .eq("id", businessId)
        .select()
        .single(),
    );

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
