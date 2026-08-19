"use client";

import { useActionState } from "react";

import { createOrderAction } from "@/actions/checkout/create-order";
import { initialCheckoutFormState } from "@/actions/checkout/types";

const FIELD =
  "w-full rounded border-2 border-ink bg-paper px-3.5 py-3 text-[14.5px] text-ink placeholder:text-ink/40";
const LABEL =
  "mb-1.5 block text-[12.5px] font-bold uppercase tracking-[.08em] text-teal";
const ERROR = "mt-1.5 text-[12.5px] text-coral";

export type CheckoutPaymentOption = {
  id: string;
  label: string;
};

export function CheckoutForm({
  paymentMethods,
}: {
  paymentMethods: CheckoutPaymentOption[];
}) {
  const [state, formAction, pending] = useActionState(
    createOrderAction,
    initialCheckoutFormState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div>
        <label className={LABEL} htmlFor="checkout-name">
          Nombre
        </label>
        <input
          id="checkout-name"
          name="guestName"
          type="text"
          placeholder="Tu nombre"
          className={FIELD}
        />
        {state.errors?.guestName ? (
          <p id="checkout-name-error" data-field-error className={ERROR}>
            {state.errors.guestName[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label className={LABEL} htmlFor="checkout-contact">
          Correo o teléfono
        </label>
        <input
          id="checkout-contact"
          name="guestContact"
          type="text"
          placeholder="ana@uni.edu o 300 000 0000"
          className={FIELD}
        />
        {state.errors?.guestContact ? (
          <p id="checkout-contact-error" data-field-error className={ERROR}>
            {state.errors.guestContact[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label className={LABEL} htmlFor="checkout-payment">
          Forma de pago
        </label>
        <select
          id="checkout-payment"
          name="paymentMethodId"
          defaultValue=""
          className={FIELD}
        >
          <option value="">Selecciona una forma de pago</option>
          {paymentMethods.map((method) => (
            <option key={method.id} value={method.id}>
              {method.label}
            </option>
          ))}
        </select>
        {state.errors?.paymentMethodId ? (
          <p id="checkout-payment-error" data-field-error className={ERROR}>
            {state.errors.paymentMethodId[0]}
          </p>
        ) : null}
      </div>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          data-testid="checkout-error"
          className="rounded border-2 border-coral bg-coral/10 px-3 py-2 text-[13.5px] font-semibold text-coral"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 cursor-pointer justify-self-start rounded-[3px] border-2 border-ink bg-ink px-[26px] py-[15px] text-[15.5px] font-bold text-paper transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Confirmando..." : "Confirmar compra"}
      </button>
    </form>
  );
}
