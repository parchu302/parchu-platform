export type CartActionState = {
  status: "idle" | "error" | "success";
  message: string;
};

export const initialCartActionState: CartActionState = {
  status: "idle",
  message: "",
};
