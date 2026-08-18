"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { requireRole } from "@/lib/auth-guard";
import { readField } from "@/lib/form-data";
import { businessSchema } from "@/lib/validations/business";
import { registerBusiness } from "@/services/business-service";
import { type BusinessFormState } from "./types";

export async function registerBusinessAction(
  _prevState: BusinessFormState,
  formData: FormData,
): Promise<BusinessFormState> {
  // Las Server Actions son alcanzables por POST directo: la autorizacion se
  // verifica aqui, no solo en el proxy.
  const session = await requireRole("EMPRENDEDOR");

  const parsed = businessSchema.safeParse({
    name: readField(formData, "name"),
    description: readField(formData, "description"),
    category: readField(formData, "category"),
    contactInfo: readField(formData, "contactInfo"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos del formulario.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const outcome = await registerBusiness(session.userId, parsed.data);

  if (!outcome.ok) {
    return {
      status: "error",
      message: "",
      errors: { name: ["Ya existe un emprendimiento con ese nombre"] },
    };
  }

  redirect(`/panel/${outcome.business.id}?creado=1`);
}
