// Los archivos "use server" solo pueden exportar funciones asincronas, asi que
// el estado inicial de los formularios vive fuera de ellos.
export type BusinessFormState = {
  status: "idle" | "error";
  message: string;
  errors?: Record<string, string[] | undefined>;
};

export const initialBusinessFormState: BusinessFormState = {
  status: "idle",
  message: "",
};

export type AdminActionState = {
  status: "idle" | "error" | "success";
  message: string;
  businessId?: string;
};

export const initialAdminActionState: AdminActionState = {
  status: "idle",
  message: "",
};
