"use client";

import { useActionState, useState } from "react";
import type { PaymentType } from "@prisma/client";

import { createOrderAction } from "@/actions/checkout/create-order";
import { initialCheckoutFormState } from "@/actions/checkout/types";
import { PAYMENT_METHOD_FIELDS } from "@/lib/payment-methods";

const FIELD =
  "w-full rounded border-2 border-ink bg-paper px-3.5 py-3 text-[14.5px] text-ink placeholder:text-ink/40";
const LABEL =
  "mb-1.5 block text-[12.5px] font-bold uppercase tracking-[.08em] text-teal";
const ERROR = "mt-1.5 text-[12.5px] text-coral";

export type CheckoutPaymentOption = {
  id: string;
  label: string;
  type: PaymentType;
  details: Record<string, string>;
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
  const [selectedId, setSelectedId] = useState("");

  const selectedMethod = paymentMethods.find(
    (method) => method.id === selectedId,
  );
  // EFECTIVO no tiene campos declarados: esta condicion cubre "cualquier
  // metodo distinto de efectivo" sin necesitar comparar el tipo a mano.
  const paymentFields = selectedMethod
    ? PAYMENT_METHOD_FIELDS[selectedMethod.type]
    : [];

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
          value={selectedId}
          onChange={(event) => setSelectedId(event.target.value)}
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

        {selectedMethod && paymentFields.length > 0 ? (
          <div
            data-testid="payment-instructions"
            className="mt-3 rounded border-2 border-teal bg-teal/10 px-3.5 py-3 text-[13.5px]"
          >
            <p className="mb-1.5 font-bold text-teal">
              Datos para pagar por {selectedMethod.label}
            </p>
            <ul className="grid list-none gap-1 p-0">
              {paymentFields.map((field) => (
                <li key={field.name}>
                  <span className="text-ink/70">{field.label}: </span>
                  <span className="font-semibold">
                    {selectedMethod.details[field.name] ?? ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
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
