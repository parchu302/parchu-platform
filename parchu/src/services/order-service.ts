import { Prisma, type Order, type OrderStatus } from "@prisma/client";

import {
  createConfirmationCode,
  verifyConfirmationCode,
} from "@/lib/confirmation-code";
import { db } from "@/lib/db";
import { generateTrackingToken } from "@/lib/tracking-token";
import type { CheckoutInput } from "@/lib/validations/checkout";
import {
  InsufficientStockError,
  cancelOrderReleasingStock,
  completeOrderCountingSales,
  createOrderWithStockReservation,
  findOrderForBusiness,
  regenerateConfirmationCode,
  registerFailedCodeAttempt,
  updateOrderStatus,
} from "@/repositories/order-repository";

export type CartLine = {
  productId: string;
  quantity: number;
};

export type CreateOrderOutcome =
  | {
      ok: true;
      order: Order;
      /** Solo aquí viaja el código en claro: nunca se persiste así. */
      confirmationCode: string;
      trackingToken: string;
    }
  | {
      ok: false;
      reason:
        | "EMPTY_CART"
        | "PRODUCT_UNAVAILABLE"
        | "MULTIPLE_BUSINESSES"
        | "PAYMENT_METHOD_INVALID"
        | "INSUFFICIENT_STOCK";
      productName?: string;
    };

export async function createGuestOrder(
  cart: CartLine[],
  input: CheckoutInput,
): Promise<CreateOrderOutcome> {
  if (cart.length === 0) {
    return { ok: false, reason: "EMPTY_CART" };
  }

  // Los productos se releen de la base: del cliente solo se acepta qué quiere
  // comprar y cuánto, nunca el precio ni la disponibilidad.
  const products = await db.product.findMany({
    where: {
      id: { in: cart.map((line) => line.productId) },
      status: "PUBLICADO",
      business: { status: "APROBADO", deletedAt: null },
    },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      businessId: true,
    },
  });

  if (products.length !== cart.length) {
    return { ok: false, reason: "PRODUCT_UNAVAILABLE" };
  }

  const businessIds = new Set(products.map((product) => product.businessId));
  if (businessIds.size > 1) {
    return { ok: false, reason: "MULTIPLE_BUSINESSES" };
  }

  const businessId = products[0]!.businessId;

  // La forma de pago debe ser de ese mismo emprendimiento.
  const paymentMethod = await db.paymentMethod.findFirst({
    where: { id: input.paymentMethodId, businessId },
    select: { id: true },
  });

  if (!paymentMethod) {
    return { ok: false, reason: "PAYMENT_METHOD_INVALID" };
  }

  const productById = new Map(products.map((product) => [product.id, product]));

  // Comprobación temprana para dar un mensaje útil; la garantía real la da el
  // descuento condicional dentro de la transacción.
  const withoutStock = cart.find((line) => {
    const product = productById.get(line.productId);
    return !product || product.stock < line.quantity;
  });

  if (withoutStock) {
    return {
      ok: false,
      reason: "INSUFFICIENT_STOCK",
      productName: productById.get(withoutStock.productId)?.name,
    };
  }

  // Aritmética con Decimal, no con float: son importes.
  const items = cart.map((line) => {
    const product = productById.get(line.productId)!;
    const unitPrice = product.price;
    return {
      productId: line.productId,
      quantity: line.quantity,
      unitPrice,
      subtotal: unitPrice.mul(line.quantity),
    };
  });

  const total = items.reduce(
    (accumulator, item) => accumulator.add(item.subtotal),
    new Prisma.Decimal(0),
  );

  const confirmation = createConfirmationCode();
  const trackingToken = generateTrackingToken();

  try {
    const order = await createOrderWithStockReservation({
      businessId,
      guestName: input.guestName,
      guestContact: input.guestContact,
      paymentMethodId: paymentMethod.id,
      total,
      confirmationCodeHash: confirmation.hash,
      confirmationCodeEncrypted: confirmation.encrypted,
      trackingToken,
      items,
    });

    return {
      ok: true,
      order,
      confirmationCode: confirmation.code,
      trackingToken,
    };
  } catch (error) {
    // Otra compra se llevó el stock entre la comprobación y la transacción.
    if (error instanceof InsufficientStockError) {
      return {
        ok: false,
        reason: "INSUFFICIENT_STOCK",
        productName: productById.get(error.productId)?.name,
      };
    }
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Ciclo de vida del pedido (§6)
//
//   PENDIENTE --recibir--> RECIBIDO --entregar--> ENTREGADO --codigo--> COMPLETADO
//        |                     |
//        +------cancelar-------+--> CANCELADO (libera el stock reservado)
//
// Cancelar NO es valido desde ENTREGADO ni COMPLETADO.
// ---------------------------------------------------------------------------

export const MAX_FAILED_CODE_ATTEMPTS = 3;

const CANCELABLE_FROM: OrderStatus[] = ["PENDIENTE", "RECIBIDO"];

export type OrderTransitionOutcome =
  | { ok: true; order: Order }
  | { ok: false; reason: "NOT_FOUND" | "INVALID_STATUS" };

export type ValidateCodeOutcome =
  | { ok: true; order: Order }
  | {
      ok: false;
      reason: "NOT_FOUND" | "INVALID_STATUS" | "LOCKED" | "INCORRECT_CODE";
      failedAttempts?: number;
      justLocked?: boolean;
    };

export type UnlockCodeOutcome =
  | { ok: true; order: Order }
  | { ok: false; reason: "NOT_FOUND" | "NOT_LOCKED" };

// El emprendedor solo puede operar pedidos de SU emprendimiento: el scoping va
// en la consulta, no en un chequeo posterior.
export async function receiveOrder(
  orderId: string,
  businessId: string,
): Promise<OrderTransitionOutcome> {
  const order = await findOrderForBusiness(orderId, businessId);
  if (!order) return { ok: false, reason: "NOT_FOUND" };

  if (order.status !== "PENDIENTE") {
    return { ok: false, reason: "INVALID_STATUS" };
  }

  return { ok: true, order: await updateOrderStatus(orderId, "RECIBIDO") };
}

export async function markOrderDelivered(
  orderId: string,
  businessId: string,
): Promise<OrderTransitionOutcome> {
  const order = await findOrderForBusiness(orderId, businessId);
  if (!order) return { ok: false, reason: "NOT_FOUND" };

  // Solo desde RECIBIDO: entregar algo que no se ha recibido no tiene sentido.
  if (order.status !== "RECIBIDO") {
    return { ok: false, reason: "INVALID_STATUS" };
  }

  return { ok: true, order: await updateOrderStatus(orderId, "ENTREGADO") };
}

export async function cancelOrder(
  orderId: string,
  businessId: string,
  reason: string,
): Promise<OrderTransitionOutcome> {
  const order = await findOrderForBusiness(orderId, businessId);
  if (!order) return { ok: false, reason: "NOT_FOUND" };

  if (!CANCELABLE_FROM.includes(order.status)) {
    return { ok: false, reason: "INVALID_STATUS" };
  }

  const cancelled = await cancelOrderReleasingStock(
    orderId,
    reason,
    order.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
    })),
  );

  return { ok: true, order: cancelled };
}

export async function validateOrderCode(
  orderId: string,
  businessId: string,
  candidateCode: string,
): Promise<ValidateCodeOutcome> {
  const order = await findOrderForBusiness(orderId, businessId);
  if (!order) return { ok: false, reason: "NOT_FOUND" };

  // El codigo solo se valida sobre un pedido entregado. Este rechazo NO cuenta
  // como intento fallido: es una precondicion, no un codigo equivocado.
  if (order.status !== "ENTREGADO") {
    return { ok: false, reason: "INVALID_STATUS" };
  }

  if (order.codeLocked) {
    return { ok: false, reason: "LOCKED", failedAttempts: order.failedAttempts };
  }

  if (verifyConfirmationCode(order.confirmationCodeHash, candidateCode)) {
    const completed = await completeOrderCountingSales(
      orderId,
      order.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    );
    return { ok: true, order: completed };
  }

  const failedAttempts = order.failedAttempts + 1;
  const codeLocked = failedAttempts >= MAX_FAILED_CODE_ATTEMPTS;

  await registerFailedCodeAttempt(orderId, failedAttempts, codeLocked);

  return {
    ok: false,
    reason: codeLocked ? "LOCKED" : "INCORRECT_CODE",
    failedAttempts,
    justLocked: codeLocked,
  };
}

// Desbloqueo del administrador: regenera el codigo en vez de limpiar el
// contador, para que el codigo viejo (que ya se intento adivinar) deje de
// servir. El cliente ve el nuevo en su enlace de seguimiento.
export async function unlockOrderCode(
  orderId: string,
): Promise<UnlockCodeOutcome> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false, reason: "NOT_FOUND" };

  if (!order.codeLocked) {
    return { ok: false, reason: "NOT_LOCKED" };
  }

  const confirmation = createConfirmationCode();
  const updated = await regenerateConfirmationCode(
    orderId,
    confirmation.hash,
    confirmation.encrypted,
  );

  return { ok: true, order: updated };
}
