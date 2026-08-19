import { z } from "zod";

// El contacto puede ser correo O telefono: el cliente invitado elige.
const PHONE_PATTERN = /^[\d+()\s-]{7,25}$/;

function looksLikeEmail(value: string): boolean {
  return z.email().safeParse(value).success;
}

function looksLikePhone(value: string): boolean {
  return PHONE_PATTERN.test(value);
}

export const checkoutSchema = z.object({
  guestName: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(120, "El nombre es demasiado largo"),
  guestContact: z
    .string()
    .trim()
    .min(1, "El contacto es obligatorio")
    .max(120, "El contacto es demasiado largo")
    .refine(
      (value) => looksLikeEmail(value) || looksLikePhone(value),
      "Ingresa un correo o un teléfono válido",
    ),
  paymentMethodId: z.string().trim().min(1, "Selecciona una forma de pago"),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
