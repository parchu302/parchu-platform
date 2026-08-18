"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireRole } from "@/lib/auth-guard";
import { readField } from "@/lib/form-data";
import { PAYMENT_METHOD_FIELDS, PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";
import { paymentMethodSchema } from "@/lib/validations/payment-method";
import { registerPaymentMethod } from "@/services/payment-method-service";
import { type CatalogFormState } from "./types";

const NOT_APPROVED_MESSAGE =
  "Ese emprendimiento aún no ha sido aprobado, así que no puedes registrar formas de pago.";

export async function registerPaymentMethodAction(
  _prevState: CatalogFormState,
  formData: FormData,
): Promise<CatalogFormState> {
  const session = await requireRole("EMPRENDEDOR");
  const businessId = readField(formData, "businessId");
  const type = readField(formData, "type");

  // Solo se leen los campos que ese metodo declara: asi el formulario y la
  // validacion no pueden desalinearse.
  const declaredFields =
    PAYMENT_METHOD_FIELDS[type as keyof typeof PAYMENT_METHOD_FIELDS] ?? [];

  const payload: Record<string, string> = { type };
  for (const field of declaredFields) {
    payload[field.name] = readField(formData, field.name);
  }

  const parsed = paymentMethodSchema.safeParse(payload);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Faltan datos para ese método de pago.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const outcome = await registerPaymentMethod(
    businessId,
    session.userId,
    parsed.data,
  );

  if (!outcome.ok) {
    return {
      status: "error",
      message:
        outcome.reason === "NOT_APPROVED"
          ? NOT_APPROVED_MESSAGE
          : "No encontramos ese emprendimiento.",
    };
  }

  revalidatePath(`/panel/${businessId}/pagos`);

  return {
    status: "success",
    message: `Forma de pago "${PAYMENT_METHOD_LABEL[outcome.paymentMethod.type]}" registrada.`,
  };
}
