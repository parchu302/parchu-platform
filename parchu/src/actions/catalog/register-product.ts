"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth-guard";
import { readField } from "@/lib/form-data";
import { productSchema } from "@/lib/validations/product";
import { registerProduct } from "@/services/product-service";
import { type CatalogFormState } from "./types";

const NOT_APPROVED_MESSAGE =
  "Ese emprendimiento aún no ha sido aprobado, así que no puedes registrar productos.";

export async function registerProductAction(
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const session = await requireRole("EMPRENDEDOR");
  const businessId = readField(formData, "businessId");

  const parsed = productSchema.safeParse({
    name: readField(formData, "name"),
    description: readField(formData, "description"),
    price: readField(formData, "price"),
    category: readField(formData, "category"),
    stock: readField(formData, "stock"),
    image: readField(formData, "image"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos del producto.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const outcome = await registerProduct(businessId, session.userId, parsed.data);

  if (!outcome.ok) {
    return {
      status: "error",
      message:
        outcome.reason === "NOT_APPROVED"
          ? NOT_APPROVED_MESSAGE
          : "No encontramos ese emprendimiento.",
    };
  }

  revalidatePath(`/panel/${businessId}/productos`);

  return {
    status: "success",
    message: `Producto "${outcome.product.name}" publicado.`,
  };
}
