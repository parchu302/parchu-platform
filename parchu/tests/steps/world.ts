import { test as base, createBdd } from "playwright-bdd";

export type TestState = {
  email: string;
  password: string;
  accountsBefore: number;
};

// Estado compartido entre los pasos de un mismo escenario (que correo se uso,
// cuantas cuentas habia antes del intento).
export const test = base.extend<{ state: TestState }>({
  state: async ({}, use) => {
    await use({ email: "", password: "", accountsBefore: 0 });
  },
});

export const { Given, When, Then } = createBdd(test);

export const VALID_PASSWORD = "ClaveSegura1";
