"use client";

import { useActionState } from "react";

import { registerAction } from "@/actions/auth/register";
import { initialAuthFormState } from "@/actions/auth/types";

import { AuthField } from "./AuthField";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    registerAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <AuthField
          id="register-firstName"
          name="firstName"
          label="Nombre"
          autoComplete="given-name"
          placeholder="Ana"
          error={state.errors?.firstName?.[0]}
        />
        <AuthField
          id="register-lastName"
          name="lastName"
          label="Apellido (opcional)"
          autoComplete="family-name"
          placeholder="Pérez"
          error={state.errors?.lastName?.[0]}
        />
      </div>

      <AuthField
        id="register-email"
        name="email"
        label="Correo"
        type="email"
        autoComplete="email"
        placeholder="ana@uni.edu"
        error={state.errors?.email?.[0]}
      />
      <AuthField
        id="register-password"
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="new-password"
        error={state.errors?.password?.[0]}
      />

      <p className="text-[12.5px] text-ink/65">
        Mínimo 8 caracteres, con al menos una mayúscula y un número.
      </p>

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          data-testid="auth-error"
          aria-live="polite"
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
        {pending ? "Creando cuenta..." : "Crear cuenta"}
      </button>
    </form>
  );
}
