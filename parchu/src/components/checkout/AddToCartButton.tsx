"use client";

import { useActionState } from "react";

import { addToCartAction } from "@/actions/cart/manage-cart";
import { initialCartActionState } from "@/actions/cart/types";

export function AddToCartButton({
  productId,
  disabled,
}: {
  productId: string;
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    addToCartAction,
    initialCartActionState,
  );

  return (
    <form action={formAction} className="mt-3">
      <input type="hidden" name="productId" value={productId} />
      <button
        type="submit"
        disabled={pending || disabled}
        className="cursor-pointer rounded border-2 border-ink bg-ink px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-[.06em] text-paper disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled ? "Sin stock" : pending ? "Agregando..." : "Agregar"}
      </button>
      {state.status !== "idle" && state.message ? (
        <p
          role="status"
          data-testid="cart-message"
          className={`mt-2 text-[12px] font-semibold ${
            state.status === "error" ? "text-coral" : "text-teal"
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
