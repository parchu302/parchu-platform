"use client";

import { useActionState } from "react";

import { loginAction } from "@/actions/auth/login";
import { initialAuthFormState } from "@/actions/auth/types";

import { AuthField } from "./AuthField";

export function LoginForm() {
  const [state, formAction, pending] = useActionState(
    loginAction,
    initialAuthFormState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <AuthField
        id="login-email"
        name="email"
        label="Correo"
        type="email"
        autoComplete="email"
        placeholder="ana@uni.edu"
      />
      <AuthField
        id="login-password"
        name="password"
        label="Contraseña"
        type="password"
        autoComplete="current-password"
      />

      {state.status === "error" ? (
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
        {pending ? "Entrando..." : "Iniciar sesión"}
      </button>
    </form>
  );
}
