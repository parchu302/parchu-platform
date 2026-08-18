import { expect } from "@playwright/test";

import {
  AUTH_SETTLED,
  BUSINESS_SETTLED,
  waitForFormOutcome,
} from "./helpers";
import { Then, When } from "./world";

// Estos dos pasos tienen texto identico en los escenarios de registro de
// usuario (0.1) y de registro de emprendimiento (1). Se resuelven segun el
// formulario activo, para no tener que alterar el Gherkin original.

const REQUIRED_FIELD_ERROR: Record<string, { selector: string; text: string }> =
  {
    // Formulario de cuenta (0.1)
    correo: { selector: "#register-email-error", text: "El correo es obligatorio" },
    contraseña: {
      selector: "#register-password-error",
      text: "La contraseña es obligatoria",
    },
    // Formulario de emprendimiento (1)
    nombre: { selector: "", text: "El nombre es obligatorio" },
    descripción: {
      selector: "#business-description-error",
      text: "La descripción es obligatoria",
    },
    categoría: {
      selector: "#business-category-error",
      text: "La categoría es obligatoria",
    },
  };

When("confirma el registro", async ({ page, state }) => {
  if (state.formKind === "business") {
    await page
      .getByRole("button", { name: /registrar emprendimiento/i })
      .click();
    await waitForFormOutcome(page, BUSINESS_SETTLED);
    return;
  }

  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await waitForFormOutcome(page, AUTH_SETTLED);
});

Then(
  "el sistema muestra un error indicando que el campo {string} es obligatorio",
  async ({ page, state }, campo: string) => {
    const entry = REQUIRED_FIELD_ERROR[campo];
    expect(entry, `campo desconocido: ${campo}`).toBeTruthy();

    // "nombre" existe en ambos formularios: depende del contexto.
    const selector =
      campo === "nombre"
        ? state.formKind === "business"
          ? "#business-name-error"
          : "#register-firstName-error"
        : entry!.selector;

    await expect(page.locator(selector)).toHaveText(entry!.text);
  },
);
