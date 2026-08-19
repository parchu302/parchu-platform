import { headers } from "next/headers";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { OrderStatus } from "@prisma/client";

import { decryptConfirmationCode } from "@/lib/confirmation-code";
import { formatPrice } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";
import { findOrderByTrackingToken } from "@/repositories/order-repository";

export const metadata: Metadata = {
  title: "Seguimiento de tu pedido — ParchU",
  robots: { index: false, follow: false },
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDIENTE: "Pendiente",
  RECIBIDO: "Recibido por el emprendimiento",
  ENTREGADO: "Entregado",
  COMPLETADO: "Completado",
  CANCELADO: "Cancelado",
};

async function absoluteUrl(path: string): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("host") ?? "localhost:3000";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  return `${protocol}://${host}${path}`;
}

export default async function SeguimientoPage({
  params,
  searchParams,
}: PageProps<"/seguimiento/[token]">) {
  const { token } = await params;
  const { nuevo } = await searchParams;

  const order = await findOrderByTrackingToken(token);

  // Token inválido y pedido inexistente responden igual: el enlace es la única
  // credencial del cliente invitado, no se confirma qué tokens existen.
  if (!order) notFound();

  // El código se guarda cifrado, nunca en claro: aquí se descifra para
  // mostrárselo a quien tiene el enlace.
  const confirmationCode = decryptConfirmationCode(
    order.confirmationCodeEncrypted,
  );
  const trackingUrl = await absoluteUrl(`/seguimiento/${order.trackingToken}`);

  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-12">
      {nuevo ? (
        <p
          role="status"
          data-testid="order-confirmed"
          className="mb-6 rounded border-2 border-teal bg-teal/10 px-4 py-3 text-[14px] font-semibold text-teal"
        >
          ¡Listo! Tu pedido quedó registrado.
        </p>
      ) : null}

      <h1 className="mb-2 font-display text-[28px]">Tu pedido</h1>
      <p className="mb-8 text-[14.5px] text-ink/75">{order.business.name}</p>

      <section className="mb-6 rounded-lg border-2 border-ink bg-paper-2 p-6">
        <div className="font-mono text-[12px] font-bold uppercase tracking-[.08em] text-teal">
          Estado
        </div>
        <p data-testid="order-status" className="m-0 mt-1 font-display text-[22px]">
          {STATUS_LABEL[order.status]}
        </p>
        {order.status === "CANCELADO" && order.cancelReason ? (
          <p className="mt-2 text-[13.5px] text-coral">
            Motivo: {order.cancelReason}
          </p>
        ) : null}
      </section>

      <section className="mb-6 rounded-lg border-2 border-mustard bg-mustard/15 p-6">
        <div className="font-mono text-[12px] font-bold uppercase tracking-[.08em] text-ink/70">
          Código de confirmación
        </div>
        <p
          data-testid="confirmation-code"
          className="m-0 mt-1 font-mono text-[32px] font-bold tracking-[.2em]"
        >
          {confirmationCode}
        </p>
        <p className="mt-2 text-[13px] text-ink/75">
          Dáselo al emprendimiento cuando recibas tu pedido. Es lo que confirma
          la entrega.
        </p>
      </section>

      <section className="mb-6 rounded-lg border-2 border-ink bg-paper p-6">
        <h2 className="mb-4 font-display text-[18px]">Detalle</h2>
        <ul className="grid list-none gap-3 p-0">
          {order.items.map((item) => (
            <li
              key={item.id}
              data-order-item={item.product.name}
              className="flex justify-between gap-3 text-[14px]"
            >
              <span>
                {item.quantity} × {item.product.name}
              </span>
              <span className="font-mono">{formatPrice(item.subtotal)}</span>
            </li>
          ))}
        </ul>
        <p className="mt-4 flex justify-between border-t-2 border-ink pt-3 font-display text-[18px]">
          <span>Total</span>
          <span data-testid="order-total">{formatPrice(order.total)}</span>
        </p>
        <p className="mt-3 text-[13px] text-ink/70">
          Forma de pago: {PAYMENT_METHOD_LABEL[order.paymentMethod.type]}
        </p>
      </section>

      <section className="rounded-lg border-2 border-dashed border-line p-6">
        <div className="font-mono text-[12px] font-bold uppercase tracking-[.08em] text-teal">
          Tu enlace de seguimiento
        </div>
        <p
          data-testid="tracking-link"
          className="m-0 mt-2 break-all font-mono text-[12.5px]"
        >
          {trackingUrl}
        </p>
        <p className="mt-2 text-[13px] text-ink/70">
          Guárdalo: es la forma de consultar tu pedido y tu código.
        </p>
      </section>
    </main>
  );
}
