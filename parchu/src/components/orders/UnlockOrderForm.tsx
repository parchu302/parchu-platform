"use client";

import { useActionState } from "react";

import { unlockOrderAction } from "@/actions/orders/admin-unlock";
import { initialOrderActionState } from "@/actions/orders/types";

export function UnlockOrderForm({ orderId }: { orderId: string }) {
  const [state, formAction, pending] = useActionState(
    unlockOrderAction,
    initialOrderActionState,
  );

  return (
    <form action={formAction} className="mt-3 grid gap-2">
      <input type="hidden" name="orderId" value={orderId} />
      <button
        type="submit"
        disabled={pending}
        className="cursor-pointer justify-self-start rounded border-2 border-ink bg-ink px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[.06em] text-paper disabled:opacity-50"
      >
        {pending ? "Regenerando..." : "Regenerar código"}
      </button>

      {state.status !== "idle" && state.message ? (
        <p
          role="status"
          data-testid="unlock-message"
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
  );
}
