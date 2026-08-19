import type { OrderStatus } from "@prisma/client";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDIENTE: "Pendiente",
  RECIBIDO: "Recibido",
  ENTREGADO: "Entregado",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

const STYLE: Record<OrderStatus, string> = {
  PENDIENTE: "border-mustard bg-mustard/20 text-ink",
  RECIBIDO: "border-teal bg-teal/15 text-teal",
  ENTREGADO: "border-ink bg-paper text-ink",
  COMPLETADO: "border-teal bg-teal text-paper",
  CANCELADO: "border-coral bg-coral/15 text-coral",
};

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span
      data-order-status={status}
      className={`inline-block rounded-full border-2 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[.06em] ${STYLE[status]}`}
    >
      {ORDER_STATUS_LABEL[status]}
    </span>
  );
}
