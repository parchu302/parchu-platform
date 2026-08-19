import type { Order, OrderStatus, Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export class InsufficientStockError extends Error {
  constructor(readonly productId: string) {
    super(`Stock insuficiente para el producto ${productId}`);
    this.name = "InsufficientStockError";
  }
}

export type NewOrderItem = {
  productId: string;
  quantity: number;
  unitPrice: Prisma.Decimal;
  subtotal: Prisma.Decimal;
};

export type NewOrder = {
  businessId: string;
  guestName: string;
  guestContact: string;
  paymentMethodId: string;
  total: Prisma.Decimal;
  confirmationCodeHash: string;
  confirmationCodeEncrypted: string;
  trackingToken: string;
  items: NewOrderItem[];
};

// Reserva de stock y creacion del pedido en UNA transaccion.
//
// El descuento es condicional (`WHERE stock >= cantidad`) en vez de leer y
// luego escribir: asi dos compras simultaneas del ultimo articulo no pueden
// dejar el stock negativo. La fila queda bloqueada por el UPDATE, de modo que
// la segunda transaccion evalua la condicion sobre el valor ya descontado y
// afecta cero filas.
export async function createOrderWithStockReservation(
  input: NewOrder,
): Promise<Order> {
  return db.$transaction(async (tx) => {
    for (const item of input.items) {
      const affectedRows = await tx.$executeRaw`
        UPDATE "Product"
        SET "stock" = "stock" - ${item.quantity}
        WHERE "id" = ${item.productId} AND "stock" >= ${item.quantity}
      `;

      // Cero filas afectadas = no habia stock suficiente. Lanzar revierte
      // tambien los descuentos de los items anteriores.
      if (affectedRows === 0) {
        throw new InsufficientStockError(item.productId);
      }
    }

    return tx.order.create({
      data: {
        businessId: input.businessId,
        guestName: input.guestName,
        guestContact: input.guestContact,
        paymentMethodId: input.paymentMethodId,
        total: input.total,
        confirmationCodeHash: input.confirmationCodeHash,
        confirmationCodeEncrypted: input.confirmationCodeEncrypted,
        trackingToken: input.trackingToken,
        items: {
          create: input.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            subtotal: item.subtotal,
          })),
        },
      },
    });
  });
}

export async function findOrderByTrackingToken(trackingToken: string) {
  return db.order.findUnique({
    where: { trackingToken },
    include: {
      business: { select: { name: true, contactInfo: true } },
      paymentMethod: { select: { type: true, details: true } },
      items: {
        include: { product: { select: { name: true } } },
      },
    },
  });
}

export async function findOrderForBusiness(orderId: string, businessId: string) {
  return db.order.findFirst({
    where: { id: orderId, businessId },
    include: { items: true },
  });
}

export async function listOrdersForBusiness(businessId: string) {
  return db.order.findMany({
    where: { businessId },
    include: {
      items: { include: { product: { select: { name: true } } } },
      paymentMethod: { select: { type: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function listLockedOrders() {
  return db.order.findMany({
    where: { codeLocked: true },
    include: { business: { select: { name: true } } },
    orderBy: { updatedAt: "desc" },
  });
}

// Cancelar libera el stock reservado. Va en la misma transaccion que el cambio
// de estado: si una de las dos partes fallara, no puede quedar stock devuelto
// sobre un pedido que sigue vivo (ni al reves).
export async function cancelOrderReleasingStock(
  orderId: string,
  reason: string,
  items: { productId: string; quantity: number }[],
): Promise<Order> {
  return db.$transaction(async (tx) => {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { increment: item.quantity } },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELADO", cancelReason: reason },
    });
  });
}

// Completar acredita las ventas. Tambien transaccional: el contador de "mas
// vendidos" alimenta el catalogo publico y no puede desincronizarse del estado.
export async function completeOrderCountingSales(
  orderId: string,
  items: { productId: string; quantity: number }[],
): Promise<Order> {
  return db.$transaction(async (tx) => {
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { salesCount: { increment: item.quantity } },
      });
    }

    return tx.order.update({
      where: { id: orderId },
      data: { status: "COMPLETADO", failedAttempts: 0 },
    });
  });
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<Order> {
  return db.order.update({ where: { id: orderId }, data: { status } });
}

export async function registerFailedCodeAttempt(
  orderId: string,
  failedAttempts: number,
  codeLocked: boolean,
): Promise<Order> {
  return db.order.update({
    where: { id: orderId },
    data: { failedAttempts, codeLocked },
  });
}

export async function regenerateConfirmationCode(
  orderId: string,
  hash: string,
  encrypted: string,
): Promise<Order> {
  return db.order.update({
    where: { id: orderId },
    data: {
      confirmationCodeHash: hash,
      confirmationCodeEncrypted: encrypted,
      failedAttempts: 0,
      codeLocked: false,
    },
  });
}
