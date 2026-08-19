import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { NotApprovedNotice } from "@/components/catalog/NotApprovedNotice";
import { OrderRow } from "@/components/orders/OrderRow";
import { requireRole } from "@/lib/auth-guard";
import { formatPrice } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";
import { listOrdersForBusiness } from "@/repositories/order-repository";
import { requireApprovedBusiness } from "@/services/business-service";

export const metadata: Metadata = {
  title: "Pedidos — ParchU",
};

const DATE_FORMAT = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
});

export default async function PedidosPage({
  params,
}: PageProps<"/panel/[businessId]/pedidos">) {
  const session = await requireRole("EMPRENDEDOR");
  const { businessId } = await params;

  const access = await requireApprovedBusiness(businessId, session.userId);

  if (!access.ok) {
    if (access.reason === "NOT_FOUND") notFound();
    return <NotApprovedNotice what="pedidos" />;
  }

  const orders = await listOrdersForBusiness(businessId);

  return (
    <div className="grid gap-6">
      <h2 className="font-display text-[20px]">Pedidos ({orders.length})</h2>

      {orders.length === 0 ? (
        <p className="text-[14.5px] text-ink/70">
          Todavía no has recibido pedidos.
        </p>
      ) : (
        <ul className="grid list-none gap-6 p-0">
          {orders.map((order) => (
            <OrderRow
              key={order.id}
              id={order.id}
              businessId={businessId}
              // Referencia corta y legible; el id completo no aporta al vendedor.
              reference={order.id.slice(-6).toUpperCase()}
              status={order.status}
              guestName={order.guestName}
              guestContact={order.guestContact}
              total={formatPrice(order.total)}
              paymentLabel={PAYMENT_METHOD_LABEL[order.paymentMethod.type]}
              createdAt={DATE_FORMAT.format(order.createdAt)}
              codeLocked={order.codeLocked}
              failedAttempts={order.failedAttempts}
              items={order.items.map((item) => ({
                name: item.product.name,
                quantity: item.quantity,
              }))}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
