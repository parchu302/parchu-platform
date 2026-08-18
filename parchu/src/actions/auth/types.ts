export type AuthFormState = {
  status: "idle" | "error";
  message: string;
  errors?: Record<string, string[] | undefined>;
};

export const initialAuthFormState: AuthFormState = {
  status: "idle",
  message: "",
};
