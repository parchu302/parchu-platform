// Los archivos "use server" solo exportan funciones asincronas: el estado
// inicial vive aqui.
export type CatalogFormState = {
  status: "idle" | "error" | "success";
  message: string;
  errors?: Record<string, string[] | undefined>;
};

export const initialCatalogFormState: CatalogFormState = {
  status: "idle",
  message: "",
};
