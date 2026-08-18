"use client";

import { useActionState, useState } from "react";
import type { PaymentType } from "@prisma/client";

import { registerPaymentMethodAction } from "@/actions/catalog/register-payment-method";
import { initialCatalogFormState } from "@/actions/catalog/types";
import {
  PAYMENT_METHOD_FIELDS,
  PAYMENT_METHOD_LABEL,
  PAYMENT_TYPES,
} from "@/lib/payment-methods";

import {
  CATALOG_FIELD_CLASS,
  CATALOG_LABEL_CLASS,
  CatalogField,
  CatalogMessage,
  SUBMIT_CLASS,
} from "./CatalogField";

export function PaymentMethodForm({ businessId }: { businessId: string }) {
  const [state, formAction, pending] = useActionState(
    registerPaymentMethodAction,
    initialCatalogFormState,
  );
  // Los campos requeridos dependen del metodo elegido.
  const [type, setType] = useState<PaymentType | "">("");

  const fields = type ? PAYMENT_METHOD_FIELDS[type] : [];

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="businessId" value={businessId} />

      <div>
        <label className={CATALOG_LABEL_CLASS} htmlFor="payment-type">
          Método de pago
        </label>
        <select
          id="payment-type"
          name="type"
          value={type}
          onChange={(event) => setType(event.target.value as PaymentType | "")}
          className={CATALOG_FIELD_CLASS}
        >
          <option value="">Selecciona un método</option>
          {PAYMENT_TYPES.map((paymentType) => (
            <option key={paymentType} value={paymentType}>
              {PAYMENT_METHOD_LABEL[paymentType]}
            </option>
          ))}
        </select>
        {state.errors?.type ? (
          <p
            id="payment-type-error"
            data-field-error
            className="mt-1.5 text-[12.5px] text-coral"
          >
            {state.errors.type[0]}
          </p>
        ) : null}
      </div>

      {fields.map((field) => (
        <CatalogField
          key={field.name}
          id={`payment-${field.name}`}
          name={field.name}
          label={field.label}
          placeholder={field.placeholder}
          error={state.errors?.[field.name]?.[0]}
        />
      ))}

      {type === "EFECTIVO" ? (
        <p className="text-[13px] text-ink/65">
          El pago en efectivo no requiere datos adicionales.
        </p>
      ) : null}

      <CatalogMessage status={state.status} message={state.message} />

      <button type="submit" disabled={pending} className={SUBMIT_CLASS}>
        {pending ? "Registrando..." : "Registrar forma de pago"}
      </button>
    </form>
  );
}
