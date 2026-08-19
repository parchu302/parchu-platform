import type { Order, Prisma } from "@prisma/client";

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
