"use client";

import { useActionState } from "react";

import { registerBusinessAction } from "@/actions/business/register-business";
import { initialBusinessFormState } from "@/actions/business/types";
import { BUSINESS_CATEGORIES } from "@/lib/categories";

const FIELD =
  "w-full rounded border-2 border-ink bg-paper px-3.5 py-3 text-[14.5px] text-ink placeholder:text-ink/40";
const LABEL =
  "mb-1.5 block text-[12.5px] font-bold uppercase tracking-[.08em] text-teal";
const ERROR = "mt-1.5 text-[12.5px] text-coral";

export function BusinessForm() {
  const [state, formAction, pending] = useActionState(
    registerBusinessAction,
    initialBusinessFormState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div>
        <label className={LABEL} htmlFor="business-name">
          Nombre del emprendimiento
        </label>
        <input
          id="business-name"
          name="name"
          type="text"
          placeholder="Postres de Ana"
          className={FIELD}
        />
        {state.errors?.name ? (
          <p id="business-name-error" data-field-error className={ERROR}>
            {state.errors.name[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label className={LABEL} htmlFor="business-description">
          Descripción
        </label>
        <textarea
          id="business-description"
          name="description"
          rows={3}
          placeholder="Qué vendes y cómo lo entregas"
          className={FIELD}
        />
        {state.errors?.description ? (
          <p id="business-description-error" data-field-error className={ERROR}>
            {state.errors.description[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label className={LABEL} htmlFor="business-category">
          Categoría
        </label>
        <select id="business-category" name="category" className={FIELD} defaultValue="">
          <option value="">Selecciona una categoría</option>
          {BUSINESS_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {state.errors?.category ? (
          <p id="business-category-error" data-field-error className={ERROR}>
            {state.errors.category[0]}
          </p>
        ) : null}
      </div>

      <div>
        <label className={LABEL} htmlFor="business-contactInfo">
          Datos de contacto
        </label>
        <input
          id="business-contactInfo"
          name="contactInfo"
          type="text"
          placeholder="WhatsApp, correo o punto de entrega"
          className={FIELD}
        />
        {state.errors?.contactInfo ? (
          <p id="business-contactInfo-error" data-field-error className={ERROR}>
            {state.errors.contactInfo[0]}
          </p>
        ) : null}
      </div>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          data-testid="business-error"
          className="rounded border-2 border-coral bg-coral/10 px-3 py-2 text-[13.5px] font-semibold text-coral"
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 cursor-pointer rounded-[3px] border-2 border-ink bg-ink px-[26px] py-[15px] text-[15.5px] font-bold text-paper transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "Registrando..." : "Registrar emprendimiento"}
      </button>
    </form>
  );
}
