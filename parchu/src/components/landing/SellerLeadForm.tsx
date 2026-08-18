"use client";

import { useActionState } from "react";

import { submitSellerLead } from "@/actions/leads/create-seller-lead";
import { initialSellerLeadState } from "@/actions/leads/types";

const FIELD_CLASS =
  "w-full rounded border-none bg-[#3a2f24] px-3.5 py-3 text-[14.5px] text-paper placeholder:text-paper/45";
const LABEL_CLASS =
  "mb-1.5 block text-[12.5px] font-bold uppercase tracking-[.08em] text-mustard";
const ERROR_CLASS = "mt-1.5 text-[12.5px] text-coral";

export function SellerLeadForm() {
  const [state, formAction, pending] = useActionState(
    submitSellerLead,
    initialSellerLeadState,
  );

  if (state.status === "success") {
    return (
      <p
        aria-live="polite"
        className="font-mono text-sm text-mustard"
      >
        {state.message}
      </p>
    );
  }

  return (
    <form action={formAction} className="grid max-w-[640px] gap-4 sm:grid-cols-2">
      <div>
        <label className={LABEL_CLASS} htmlFor="lead-name">
          Nombre
        </label>
        <input
          id="lead-name"
          name="name"
          type="text"
          placeholder="Tu nombre"
          aria-describedby={state.errors?.name ? "lead-name-error" : undefined}
          className={FIELD_CLASS}
        />
        {state.errors?.name ? (
          <p id="lead-name-error" className={ERROR_CLASS}>
            {state.errors.name[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label className={LABEL_CLASS} htmlFor="lead-whatsapp">
          WhatsApp
        </label>
        <input
          id="lead-whatsapp"
          name="whatsapp"
          type="tel"
          placeholder="300 000 0000"
          aria-describedby={
            state.errors?.whatsapp ? "lead-whatsapp-error" : undefined
          }
          className={FIELD_CLASS}
        />
        {state.errors?.whatsapp ? (
          <p id="lead-whatsapp-error" className={ERROR_CLASS}>
            {state.errors.whatsapp[0]}
          </p>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <label className={LABEL_CLASS} htmlFor="lead-sells">
          ¿Qué vendes?
        </label>
        <input
          id="lead-sells"
          name="sells"
          type="text"
          placeholder="Ej: postres, tutorías de física, ropa..."
          aria-describedby={state.errors?.sells ? "lead-sells-error" : undefined}
          className={FIELD_CLASS}
        />
        {state.errors?.sells ? (
          <p id="lead-sells-error" className={ERROR_CLASS}>
            {state.errors.sells[0]}
          </p>
        ) : null}
      </div>

      <div className="sm:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="mt-2 cursor-pointer rounded-[3px] border-2 border-mustard bg-mustard px-[26px] py-[15px] text-[15.5px] font-bold text-ink transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? "Enviando..." : "Enviar y unirme"}
        </button>
        {state.status === "error" ? (
          <p aria-live="polite" className={ERROR_CLASS}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
