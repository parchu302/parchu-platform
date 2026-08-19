export type OrderActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const initialOrderActionState: OrderActionState = {
  status: "idle",
  message: "",
};
