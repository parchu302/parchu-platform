"use server";

import { z } from "zod";

import { readField } from "@/lib/form-data";
import { sellerLeadSchema } from "@/lib/validations/lead";
import { createSellerLead } from "@/repositories/lead-repository";

export type SellerLeadState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Record<string, string[] | undefined>;
};

export const initialSellerLeadState: SellerLeadState = {
  status: "idle",
  message: "",
};

// Accion publica a proposito (captacion de leads del landing). Las Server
// Actions son alcanzables por POST directo, no solo desde la UI, asi que
// toda la entrada se valida aqui. El rate-limiting llega en la Fase 7.
export async function submitSellerLead(
  _prevState: SellerLeadState,
  formData: FormData,
): Promise<SellerLeadState> {
  const parsed = sellerLeadSchema.safeParse({
    name: readField(formData, "name"),
    whatsapp: readField(formData, "whatsapp"),
    sells: readField(formData, "sells"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos del formulario.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  try {
    await createSellerLead(parsed.data);
  } catch (error) {
    console.error("No se pudo registrar el lead de vendedor", error);
    return {
      status: "error",
      message: "No pudimos registrar tus datos. Intenta de nuevo en un momento.",
    };
  }

  return {
    status: "success",
    message: "¡Listo! Te contactamos esta misma semana para activar tu espacio.",
  };
}
