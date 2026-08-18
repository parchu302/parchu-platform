"use client";

import { useActionState, useState } from "react";

import { businessAdminAction } from "@/actions/business/admin";
import { initialAdminActionState } from "@/actions/business/types";
import { StatusBadge } from "@/components/business/StatusBadge";
import type { BusinessStatus } from "@prisma/client";

type BusinessAdminRowProps = {
  id: string;
  name: string;
  category: string;
  status: BusinessStatus;
  ownerEmail: string;
};

const BUTTON =
  "cursor-pointer rounded border-2 border-ink px-3 py-2 font-mono text-[12px] font-bold uppercase tracking-[.06em]";

export function BusinessAdminRow({
  id,
  name,
  category,
  status,
  ownerEmail,
}: BusinessAdminRowProps) {
  const [state, formAction, pending] = useActionState(
    businessAdminAction,
    initialAdminActionState,
  );
  // Pausar y eliminar despliegan un formulario con motivo antes de ejecutarse.
  const [mode, setMode] = useState<"pause" | "delete" | null>(null);

  return (
    <li
      data-business-name={name}
      className="rounded border-2 border-ink bg-paper-2 p-6"
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px]">{name}</h2>
          <p className="text-[12.5px] text-ink/65">
            {category} · {ownerEmail}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>

      <form action={formAction} className="grid gap-3">
        <input type="hidden" name="businessId" value={id} />

        {/* Las cuatro acciones se ofrecen siempre: la maquina de estados vive
            en el servicio, no en la UI, y rechaza las transiciones invalidas. */}
        <div className="flex flex-wrap gap-2">
          <button
            type="submit"
            name="action"
            value="approve"
            disabled={pending}
            className={`${BUTTON} bg-teal text-paper`}
          >
            Aprobar
          </button>
          <button
            type="submit"
            name="action"
            value="reactivate"
            disabled={pending}
            className={`${BUTTON} bg-paper text-ink`}
          >
            Reactivar
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "pause" ? null : "pause")}
            className={`${BUTTON} bg-mustard text-ink`}
          >
            Pausar
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === "delete" ? null : "delete")}
            className={`${BUTTON} bg-coral text-white`}
          >
            Eliminar
          </button>
        </div>

        {mode ? (
          <div className="grid gap-2 rounded border-2 border-dashed border-line p-4">
            <label
              htmlFor={`reason-${id}`}
              className="text-[12.5px] font-bold uppercase tracking-[.08em] text-teal"
            >
              Motivo {mode === "delete" ? "de la eliminación" : "de la pausa"}
            </label>
            <input
              id={`reason-${id}`}
              name="reason"
              type="text"
              placeholder="Explica el motivo para el emprendedor"
              className="w-full rounded border-2 border-ink bg-paper px-3 py-2 text-[14px]"
            />

            {mode === "delete" ? (
              <label className="flex items-center gap-2 text-[13px]">
                <input id={`confirm-${id}`} name="confirm" type="checkbox" />
                Confirmo que quiero eliminar «{name}». Se ocultará junto con sus
                productos; el histórico de pedidos se conserva.
              </label>
            ) : null}

            <button
              type="submit"
              name="action"
              value={mode}
              disabled={pending}
              className={`${BUTTON} justify-self-start ${
                mode === "delete" ? "bg-coral text-white" : "bg-mustard text-ink"
              }`}
            >
              {mode === "delete" ? "Confirmar eliminación" : "Confirmar pausa"}
            </button>
          </div>
        ) : null}

        {state.status !== "idle" && state.message ? (
          <p
            role="status"
            data-testid="admin-message"
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
