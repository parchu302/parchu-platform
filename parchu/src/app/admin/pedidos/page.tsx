import Link from "next/link";
import type { Metadata } from "next";

import { OrderStatusBadge } from "@/components/orders/OrderStatusBadge";
import { UnlockOrderForm } from "@/components/orders/UnlockOrderForm";
import { requireRole } from "@/lib/auth-guard";
import { listLockedOrders } from "@/repositories/order-repository";

export const metadata: Metadata = {
  title: "Pedidos bloqueados — ParchU",
};

export default async function AdminPedidosPage() {
  await requireRole("ADMIN");

  const orders = await listLockedOrders();

  return (
    <main className="mx-auto w-full max-w-[1100px] px-6 py-12">
      <Link href="/admin" className="font-mono text-xs font-bold text-teal">
        ← Panel de administración
      </Link>

      <h1 className="mb-2 mt-4 font-display text-[28px]">
        Pedidos con código bloqueado
      </h1>
      <p className="mb-8 text-[14.5px] text-ink/75">
        Regenerar el código crea uno nuevo, reinicia los intentos y desbloquea la
        validación. El cliente lo consulta en su enlace de seguimiento.
      </p>

      {orders.length === 0 ? (
        <p data-testid="no-locked-orders" className="text-[14.5px] text-ink/70">
          No hay pedidos bloqueados.
        </p>
      ) : (
        <ul className="grid list-none gap-6 p-0">
          {orders.map((order) => (
            <li
              key={order.id}
              data-locked-order={order.id}
              className="rounded border-2 border-ink bg-paper-2 p-6"
            >
              <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="font-display text-[18px]">
                    Pedido {order.id.slice(-6).toUpperCase()}
                  </h2>
                  <p className="text-[12.5px] text-ink/65">
                    {order.business.name} · {order.guestName} ·{" "}
                    {order.failedAttempts} intentos fallidos
                  </p>
                </div>
                <OrderStatusBadge status={order.status} />
              </div>

              <UnlockOrderForm orderId={order.id} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
