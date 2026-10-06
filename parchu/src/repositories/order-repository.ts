import { createAdminClient } from "@/lib/supabase/admin";
import type { Order, OrderStatus } from "@/lib/types";

export class InsufficientStockError extends Error {
  constructor(readonly productId: string) {
    super(`Stock insuficiente para el producto ${productId}`);
    this.name = "InsufficientStockError";
  }
}

export type NewOrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
};

export type NewOrder = {
  businessId: string;
  guestName: string;
  guestContact: string;
  paymentMethodId: string;
  total: number;
  confirmationCodeHash: string;
  confirmationCodeEncrypted: string;
  trackingToken: string;
  items: NewOrderItem[];
};

const INSUFFICIENT_STOCK_PREFIX = "INSUFFICIENT_STOCK:";

// Reserva de stock y creacion del pedido en UNA transaccion: la RPC
// create_order_with_stock_reservation hace el descuento condicional
// (`WHERE stock >= cantidad`) y la insercion atomicamente. Si falta stock lanza
// un error con message `INSUFFICIENT_STOCK:<productId>` que se mapea a
// InsufficientStockError (la RPC revierte tambien los descuentos previos).
export async function createOrderWithStockReservation(
  input: NewOrder,
): Promise<Order> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("create_order_with_stock_reservation", {
    p_business_id: input.businessId,
    p_guest_name: input.guestName,
    p_guest_contact: input.guestContact,
    p_payment_method_id: input.paymentMethodId,
    p_total: input.total,
    p_confirmation_code_hash: input.confirmationCodeHash,
    p_confirmation_code_encrypted: input.confirmationCodeEncrypted,
    p_tracking_token: input.trackingToken,
    p_items: input.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      subtotal: item.subtotal,
    })),
  });

  if (error) {
    if (error.message.startsWith(INSUFFICIENT_STOCK_PREFIX)) {
      throw new InsufficientStockError(
        error.message.slice(INSUFFICIENT_STOCK_PREFIX.length).trim(),
      );
    }
    throw error;
  }

  return data;
}

export async function findOrderByTrackingToken(trackingToken: string) {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Order")
    .select(
      "*, business:Business(name, contactInfo), paymentMethod:PaymentMethod(type, details), items:OrderItem(*, product:Product(name))",
    )
    .eq("trackingToken", trackingToken)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function findOrderForBusiness(orderId: string, businessId: string) {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Order")
    .select("*, items:OrderItem(*)")
    .eq("id", orderId)
    .eq("businessId", businessId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listOrdersForBusiness(businessId: string) {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Order")
    .select(
      "*, items:OrderItem(*, product:Product(name)), paymentMethod:PaymentMethod(type)",
    )
    .eq("businessId", businessId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data;
}

export async function listLockedOrders() {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Order")
    .select("*, business:Business(name)")
    .eq("codeLocked", true)
    .order("updatedAt", { ascending: false });
  if (error) throw error;
  return data;
}

// Cancelar libera el stock reservado. La RPC lo hace en la misma transaccion
// que el cambio de estado: no puede quedar stock devuelto sobre un pedido vivo
// (ni al reves).
export async function cancelOrderReleasingStock(
  orderId: string,
  reason: string,
  items: { productId: string; quantity: number }[],
): Promise<Order> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("cancel_order_releasing_stock", {
    p_order_id: orderId,
    p_reason: reason,
    p_items: items,
  });
  if (error) throw error;
  return data;
}

// Completar acredita las ventas. Tambien transaccional (RPC): el contador de
// "mas vendidos" alimenta el catalogo publico y no puede desincronizarse.
export async function completeOrderCountingSales(
  orderId: string,
  items: { productId: string; quantity: number }[],
): Promise<Order> {
  const sb = createAdminClient();
  const { data, error } = await sb.rpc("complete_order_counting_sales", {
    p_order_id: orderId,
    p_items: items,
  });
  if (error) throw error;
  return data;
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
): Promise<Order> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Order")
    .update({ status })
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function registerFailedCodeAttempt(
  orderId: string,
  failedAttempts: number,
  codeLocked: boolean,
): Promise<Order> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Order")
    .update({ failedAttempts, codeLocked })
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function regenerateConfirmationCode(
  orderId: string,
  hash: string,
  encrypted: string,
): Promise<Order> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Order")
    .update({
      confirmationCodeHash: hash,
      confirmationCodeEncrypted: encrypted,
      failedAttempts: 0,
      codeLocked: false,
    })
    .eq("id", orderId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
