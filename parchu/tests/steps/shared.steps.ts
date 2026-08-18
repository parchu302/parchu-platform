import { expect } from "@playwright/test";

import {
  AUTH_SETTLED,
  BUSINESS_SETTLED,
  waitForFormOutcome,
} from "./helpers";
import { type FormKind, Then, When } from "./world";

// Varios pasos tienen texto identico en los escenarios de registro de cuenta
// (0.1), de emprendimiento (1) y de producto (2). En vez de alterar el Gherkin
// original, se resuelven segun el formulario activo.

type FieldSpec = { selector: string; text: string };

const REQUIRED_FIELD_ERROR: Partial<
  Record<FormKind, Record<string, FieldSpec>>
> = {
  auth: {
    correo: {
      selector: "#register-email-error",
      text: "El correo es obligatorio",
    },
    contraseña: {
      selector: "#register-password-error",
      text: "La contraseña es obligatoria",
    },
    nombre: {
      selector: "#register-firstName-error",
      text: "El nombre es obligatorio",
    },
  },
  business: {
    nombre: {
      selector: "#business-name-error",
      text: "El nombre es obligatorio",
    },
    descripción: {
      selector: "#business-description-error",
      text: "La descripción es obligatoria",
    },
    categoría: {
      selector: "#business-category-error",
      text: "La categoría es obligatoria",
    },
  },
  product: {
    nombre: {
      selector: "#product-name-error",
      text: "El nombre es obligatorio",
    },
    precio: {
      selector: "#product-price-error",
      text: "El precio es obligatorio",
    },
    categoría: {
      selector: "#product-category-error",
      text: "La categoría es obligatoria",
    },
    stock: {
      selector: "#product-stock-error",
      text: "El stock es obligatorio",
    },
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
    const spec = REQUIRED_FIELD_ERROR[state.formKind]?.[campo];
    expect(
      spec,
      `campo "${campo}" no mapeado para el formulario "${state.formKind}"`,
    ).toBeTruthy();

    await expect(page.locator(spec!.selector)).toHaveText(spec!.text);
  },
);

Then("muestra un mensaje de confirmación al emprendedor", async ({
  page,
  state,
}) => {
  if (state.formKind === "business") {
    await expect(page.getByTestId("business-created")).toBeVisible();
    return;
  }

  await expect(page.getByTestId("catalog-message")).toBeVisible();
});
