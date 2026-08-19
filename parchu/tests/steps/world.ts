import { test as base, createBdd } from "playwright-bdd";

export type FormKind =
  | "auth"
  | "business"
  | "product"
  | "payment"
  | "checkout";

export type TestState = {
  email: string;
  password: string;
  accountsBefore: number;
  // Que formulario se esta usando: hay pasos con texto identico en los
  // escenarios de registro de usuario y de registro de emprendimiento.
  formKind: FormKind;
  businessName: string;
  businessId: string;
  businessesBefore: number;
};

export const test = base.extend<{ state: TestState }>({
  state: async ({}, use) => {
    await use({
      email: "",
      password: "",
      accountsBefore: 0,
      formKind: "auth",
      businessName: "",
      businessId: "",
      businessesBefore: 0,
    });
  },
});

export const { Given, When, Then } = createBdd(test);

export const VALID_PASSWORD = "ClaveSegura1";
