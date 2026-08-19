"use client";

import { useActionState, useState } from "react";
import type { OrderStatus } from "@prisma/client";

import { manageOrderAction } from "@/actions/orders/manage-order";
import { initialOrderActionState } from "@/actions/orders/types";

import { OrderStatusBadge } from "./OrderStatusBadge";

type OrderRowProps = {
  id: string;
  businessId: string;
  reference: string;
  status: OrderStatus;
  guestName: string;
  guestContact: string;
  total: string;
  paymentLabel: string;
  createdAt: string;
  codeLocked: boolean;
  failedAttempts: number;
  items: { name: string; quantity: number }[];
};

const BUTTON =
  "cursor-pointer rounded border-2 border-ink px-3 py-2 font-mono text-[12px] font-bold uppercase tracking-[.06em] disabled:cursor-not-allowed disabled:opacity-50";

export function OrderRow(props: OrderRowProps) {
  const [state, formAction, pending] = useActionState(
    manageOrderAction,
    initialOrderActionState,
  );
  const [panel, setPanel] = useState<"cancel" | "code" | null>(null);

  return (
    <li
      data-order-reference={props.reference}
      className="rounded border-2 border-ink bg-paper-2 p-6"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[18px]">Pedido {props.reference}</h2>
          <p className="text-[12.5px] text-ink/65">
            {props.guestName} · {props.guestContact} · {props.createdAt}
          </p>
        </div>
        <OrderStatusBadge status={props.status} />
      </div>

      <ul className="mb-3 grid list-none gap-1 p-0 text-[13.5px]">
        {props.items.map((item) => (
          <li key={item.name}>
            {item.quantity} × {item.name}
          </li>
        ))}
      </ul>

      <p className="mb-4 font-mono text-[14px] font-bold">
        {props.total} · {props.paymentLabel}
      </p>

      {props.codeLocked ? (
        <p
          data-testid="order-locked"
          className="mb-3 rounded border-2 border-coral bg-coral/10 px-3 py-2 text-[13px] font-semibold text-coral"
        >
          Validación bloqueada tras {props.failedAttempts} intentos fallidos.
          Requiere soporte del administrador.
        </p>
      ) : null}

      <form action={formAction} className="grid gap-3">
        <input type="hidden" name="orderId" value={props.id} />
        <input type="hidden" name="businessId" value={props.businessId} />

        {/* Se ofrecen todas las acciones: la máquina de estados vive en el
            servicio, no en la interfaz, y rechaza las transiciones inválidas. */}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="action"
            value="receive"
            disabled={pending}
            className={`${BUTTON} bg-teal text-paper`}
          >
            Recibir
          </button>
          <button
            type="submit"
            name="action"
            value="deliver"
            disabled={pending}
            className={`${BUTTON} bg-paper text-ink`}
          >
            Marcar entregado
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "code" ? null : "code")}
            className={`${BUTTON} bg-mustard text-ink`}
          >
            Validar código
          </button>
          <button
            type="button"
            onClick={() => setPanel(panel === "cancel" ? null : "cancel")}
            className={`${BUTTON} bg-coral text-white`}
          >
            Cancelar
          </button>
        </div>

        {panel === "code" ? (
          <div className="grid gap-2 rounded border-2 border-dashed border-line p-4">
            <label
              htmlFor={`code-${props.id}`}
              className="text-[12.5px] font-bold uppercase tracking-[.08em] text-teal"
            >
              Código de confirmación del cliente
            </label>
            <input
              id={`code-${props.id}`}
              name="code"
              type="text"
              maxLength={6}
              autoComplete="off"
              placeholder="ABC234"
              className="w-[180px] rounded border-2 border-ink bg-paper px-3 py-2 font-mono text-[16px] uppercase tracking-[.2em]"
            />
            <button
              type="submit"
              name="action"
              value="validate"
              disabled={pending}
              className={`${BUTTON} justify-self-start bg-ink text-paper`}
            >
              Completar venta
            </button>
          </div>
        ) : null}

        {panel === "cancel" ? (
          <div className="grid gap-2 rounded border-2 border-dashed border-line p-4">
            <label
              htmlFor={`reason-${props.id}`}
              className="text-[12.5px] font-bold uppercase tracking-[.08em] text-teal"
            >
              Motivo de la cancelación
            </label>
            <input
              id={`reason-${props.id}`}
              name="reason"
              type="text"
              placeholder="Explica el motivo para el cliente"
              className="w-full rounded border-2 border-ink bg-paper px-3 py-2 text-[14px]"
            />
            <button
              type="submit"
              name="action"
              value="cancel"
              disabled={pending}
              className={`${BUTTON} justify-self-start bg-coral text-white`}
            >
              Confirmar cancelación
            </button>
          </div>
        ) : null}

        {state.status !== "idle" && state.message ? (
          <p
            role="status"
            data-testid="order-message"
            className={`rounded border-2 px-3 py-2 text-[13px] font-semibold ${
              state.status === "error"
                ? "border-coral bg-coral/10 text-coral"
                : "border-teal bg-teal/10 text-teal"
            }`}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </li>
  );
}
