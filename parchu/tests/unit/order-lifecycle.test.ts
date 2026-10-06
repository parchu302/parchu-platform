import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  decryptConfirmationCode,
  verifyConfirmationCode,
} from "@/lib/confirmation-code";
import type { OrderStatus } from "@/lib/types";
import {
  MAX_FAILED_CODE_ATTEMPTS,
  cancelOrder,
  createGuestOrder,
  markOrderDelivered,
  receiveOrder,
  unlockOrderCode,
  validateOrderCode,
} from "@/services/order-service";

import {
  businessIds,
  createTestUser,
  deleteTestUsers,
  must,
  sb,
} from "./helpers/supabase";

const MARKER = "fase6";
const INITIAL_STOCK = 10;
const QUANTITY = 2;

let businessId: string;
let otherBusinessId: string;
let paymentMethodId: string;
let productId: string;

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

async function getOrder(id: string) {
  return must(await sb.from("Order").select("*").eq("id", id).single());
}

async function updateOrder(
  id: string,
  data: {
    status?: OrderStatus;
    failedAttempts?: number;
    codeLocked?: boolean;
  },
) {
  must(await sb.from("Order").update(data).eq("id", id).select().single());
}

async function getProduct(id: string) {
  return must(await sb.from("Product").select("*").eq("id", id).single());
}

async function createShop(suffix: string) {
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

  const product = must(
    await sb
      .from("Product")
      .insert({
        businessId: business.id,
        name: `Producto${suffix} ${MARKER}`,
        price: 6000,
        category: "Comida",
        stock: INITIAL_STOCK,
      })
      .select("id")
      .single(),
  );

  return {
    businessId: business.id,
    paymentMethodId: method.id,
    productId: product.id,
  };
}

// Crea el pedido por el flujo real (para que el stock quede descontado como en
// una compra de verdad) y luego lo posiciona en el estado buscado.
async function orderInStatus(status: OrderStatus) {
  const outcome = await createGuestOrder(
    [{ productId, quantity: QUANTITY }],
    {
      guestName: "Cliente",
      guestContact: "cliente@uni.edu",
      paymentMethodId,
    },
  );

  if (!outcome.ok) throw new Error("no se pudo crear el pedido de prueba");

  if (status !== "PENDIENTE") {
    await updateOrder(outcome.order.id, { status });
  }

  return { id: outcome.order.id, code: outcome.confirmationCode };
}

async function stockOf(): Promise<number> {
  return (await getProduct(productId)).stock;
}

async function statusOf(orderId: string): Promise<OrderStatus> {
  return (await getOrder(orderId)).status;
}

beforeEach(async () => {
  await cleanup();
  const main = await createShop("A");
  const other = await createShop("B");
  businessId = main.businessId;
  paymentMethodId = main.paymentMethodId;
  productId = main.productId;
  otherBusinessId = other.businessId;
});

afterEach(cleanup);

describe("recibir y entregar (Gherkin 3)", () => {
  it("recibe un pedido pendiente", async () => {
    const { id } = await orderInStatus("PENDIENTE");

    expect((await receiveOrder(id, businessId)).ok).toBe(true);
    expect(await statusOf(id)).toBe("RECIBIDO");
  });

  it("marca como entregado un pedido recibido", async () => {
    const { id } = await orderInStatus("RECIBIDO");

    expect((await markOrderDelivered(id, businessId)).ok).toBe(true);
    expect(await statusOf(id)).toBe("ENTREGADO");
  });

  // Escenario: Intento de marcar como entregado un pedido no recibido
  it.each(["PENDIENTE", "ENTREGADO", "COMPLETADO", "CANCELADO"] as const)(
    "rechaza entregar desde el estado %s",
    async (status) => {
      const { id } = await orderInStatus(status);

      expect(await markOrderDelivered(id, businessId)).toEqual({
        ok: false,
        reason: "INVALID_STATUS",
      });
      expect(await statusOf(id)).toBe(status);
    },
  );

  it.each(["RECIBIDO", "ENTREGADO", "COMPLETADO", "CANCELADO"] as const)(
    "rechaza recibir desde el estado %s",
    async (status) => {
      const { id } = await orderInStatus(status);

      expect(await receiveOrder(id, businessId)).toEqual({
        ok: false,
        reason: "INVALID_STATUS",
      });
      expect(await statusOf(id)).toBe(status);
    },
  );
});

describe("cancelación (Gherkin 3)", () => {
  it.each(["PENDIENTE", "RECIBIDO"] as const)(
    "cancela desde %s y devuelve el stock reservado",
    async (status) => {
      const { id } = await orderInStatus(status);
      expect(await stockOf()).toBe(INITIAL_STOCK - QUANTITY);

      const outcome = await cancelOrder(id, businessId, "Sin ingredientes");

      expect(outcome.ok).toBe(true);
      expect(await statusOf(id)).toBe("CANCELADO");
      expect(await stockOf()).toBe(INITIAL_STOCK);

      const order = await getOrder(id);
      expect(order?.cancelReason).toBe("Sin ingredientes");
    },
  );

  // Escenario: Intento de cancelar un pedido ya entregado
  it.each(["ENTREGADO", "COMPLETADO", "CANCELADO"] as const)(
    "rechaza cancelar desde %s y no toca el stock",
    async (status) => {
      const { id } = await orderInStatus(status);
      const stockAntes = await stockOf();

      expect(await cancelOrder(id, businessId, "Motivo")).toEqual({
        ok: false,
        reason: "INVALID_STATUS",
      });
      expect(await statusOf(id)).toBe(status);
      expect(await stockOf()).toBe(stockAntes);
    },
  );
});

describe("validación del código (Gherkin 3)", () => {
  // Escenario: Finalización exitosa del pedido mediante código
  it("completa el pedido, reinicia intentos y acredita las ventas", async () => {
    const { id, code } = await orderInStatus("ENTREGADO");
    await updateOrder(id, { failedAttempts: 2 });

    const outcome = await validateOrderCode(id, businessId, code);

    expect(outcome.ok).toBe(true);
    expect(await statusOf(id)).toBe("COMPLETADO");

    const order = await getOrder(id);
    expect(order?.failedAttempts).toBe(0);

    const product = await getProduct(productId);
    expect(product?.salesCount).toBe(QUANTITY);
  });

  it("acepta el código en minúsculas", async () => {
    const { id, code } = await orderInStatus("ENTREGADO");

    expect((await validateOrderCode(id, businessId, code.toLowerCase())).ok).toBe(
      true,
    );
  });

  // Escenario: Código de confirmación incorrecto
  it("incrementa los intentos fallidos sin cambiar el estado", async () => {
    const { id } = await orderInStatus("ENTREGADO");

    const outcome = await validateOrderCode(id, businessId, "ZZZZZZ");

    expect(outcome).toMatchObject({
      ok: false,
      reason: "INCORRECT_CODE",
      failedAttempts: 1,
    });
    expect(await statusOf(id)).toBe("ENTREGADO");

    const product = await getProduct(productId);
    expect(product?.salesCount).toBe(0);
  });

  // Escenario: Bloqueo por exceder el número de intentos fallidos
  it("bloquea la validación al tercer intento fallido", async () => {
    const { id } = await orderInStatus("ENTREGADO");
    await updateOrder(id, { failedAttempts: 2 });

    const outcome = await validateOrderCode(id, businessId, "ZZZZZZ");

    expect(outcome).toMatchObject({
      ok: false,
      reason: "LOCKED",
      failedAttempts: MAX_FAILED_CODE_ATTEMPTS,
      justLocked: true,
    });

    const order = await getOrder(id);
    expect(order?.codeLocked).toBe(true);
    expect(await statusOf(id)).toBe("ENTREGADO");
  });

  it("rechaza cualquier intento mientras esté bloqueado, incluso el correcto", async () => {
    const { id, code } = await orderInStatus("ENTREGADO");
    await updateOrder(id, { failedAttempts: 3, codeLocked: true });

    expect(await validateOrderCode(id, businessId, code)).toMatchObject({
      ok: false,
      reason: "LOCKED",
    });
    expect(await statusOf(id)).toBe("ENTREGADO");
  });

  // Escenario: Intento de validar un código en un pedido no entregado
  it.each(["PENDIENTE", "RECIBIDO", "COMPLETADO", "CANCELADO"] as const)(
    "rechaza validar el código desde el estado %s sin contar intento fallido",
    async (status) => {
      const { id, code } = await orderInStatus(status);

      expect(await validateOrderCode(id, businessId, code)).toEqual({
        ok: false,
        reason: "INVALID_STATUS",
      });

      const order = await getOrder(id);
      // Es un rechazo de precondición, no un código equivocado.
      expect(order?.failedAttempts).toBe(0);
      expect(await statusOf(id)).toBe(status);
    },
  );

  it("no permite operar pedidos de otro emprendimiento", async () => {
    const { id, code } = await orderInStatus("ENTREGADO");

    expect(await validateOrderCode(id, otherBusinessId, code)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
    expect(await receiveOrder(id, otherBusinessId)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
    expect(await cancelOrder(id, otherBusinessId, "x")).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });
});

describe("desbloqueo por el administrador (Gherkin 0.2)", () => {
  // Escenario: Desbloqueo de un pedido con código bloqueado
  it("regenera el código, reinicia intentos y desbloquea", async () => {
    const { id, code } = await orderInStatus("ENTREGADO");
    await updateOrder(id, { failedAttempts: 3, codeLocked: true });
    const antes = await getOrder(id);

    const outcome = await unlockOrderCode(id);
    expect(outcome.ok).toBe(true);

    const despues = await getOrder(id);
    expect(despues?.codeLocked).toBe(false);
    expect(despues?.failedAttempts).toBe(0);
    expect(despues?.confirmationCodeHash).not.toBe(antes?.confirmationCodeHash);

    // El código viejo deja de servir; el nuevo es el que ve el cliente.
    expect(verifyConfirmationCode(despues!.confirmationCodeHash, code)).toBe(
      false,
    );
    const nuevoCodigo = decryptConfirmationCode(
      despues!.confirmationCodeEncrypted,
    );
    expect(nuevoCodigo).not.toBe(code);
    expect(
      verifyConfirmationCode(despues!.confirmationCodeHash, nuevoCodigo),
    ).toBe(true);
  });

  it("tras el desbloqueo, el nuevo código completa el pedido", async () => {
    const { id } = await orderInStatus("ENTREGADO");
    await updateOrder(id, { failedAttempts: 3, codeLocked: true });

    await unlockOrderCode(id);

    const order = await getOrder(id);
    const nuevoCodigo = decryptConfirmationCode(
      order!.confirmationCodeEncrypted,
    );

    expect((await validateOrderCode(id, businessId, nuevoCodigo)).ok).toBe(true);
    expect(await statusOf(id)).toBe("COMPLETADO");
  });

  // Escenario: Intento de regenerar el código de un pedido no bloqueado
  it("rechaza regenerar un pedido no bloqueado y no cambia el código", async () => {
    const { id } = await orderInStatus("ENTREGADO");
    const antes = await getOrder(id);

    expect(await unlockOrderCode(id)).toEqual({
      ok: false,
      reason: "NOT_LOCKED",
    });

    const despues = await getOrder(id);
    expect(despues?.confirmationCodeHash).toBe(antes?.confirmationCodeHash);
    expect(despues?.confirmationCodeEncrypted).toBe(
      antes?.confirmationCodeEncrypted,
    );
  });
});
