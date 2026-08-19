export type CheckoutFormState = {
  status: "idle" | "error";
  message: string;
  errors?: Record<string, string[] | undefined>;
};

export const initialCheckoutFormState: CheckoutFormState = {
  status: "idle",
  message: "",
};
