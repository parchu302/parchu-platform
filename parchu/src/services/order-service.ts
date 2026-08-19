import { Prisma, type Order } from "@prisma/client";

import { createConfirmationCode } from "@/lib/confirmation-code";
import { db } from "@/lib/db";
import { generateTrackingToken } from "@/lib/tracking-token";
import type { CheckoutInput } from "@/lib/validations/checkout";
import {
  InsufficientStockError,
  createOrderWithStockReservation,
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
