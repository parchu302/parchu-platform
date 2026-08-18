// Los archivos "use server" solo pueden exportar funciones asincronas, asi que
// el estado inicial de los formularios vive fuera de ellos.
export type SellerLeadState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Record<string, string[] | undefined>;
};

export const initialSellerLeadState: SellerLeadState = {
  status: "idle",
  message: "",
};
