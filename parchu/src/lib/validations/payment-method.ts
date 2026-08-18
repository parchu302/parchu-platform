import { z } from "zod";

const telefono = z
  .string()
  .trim()
  .min(7, "Ingresa un número de teléfono válido")
  .max(25, "Ingresa un número de teléfono válido")
  .regex(/^[\d+()\s-]+$/, "El teléfono solo puede tener dígitos, espacios y + ( ) -");

const requiredText = (message: string) =>
  z.string().trim().min(1, message).max(120, "El valor es demasiado largo");

// Union discriminada por tipo: cada metodo exige exactamente sus datos, y los
// que faltan se reportan con el nombre del campo.
const paymentMethodVariants = z.discriminatedUnion(
  "type",
  [
    z.object({
      type: z.literal("TRANSFERENCIA"),
      banco: requiredText("El banco es obligatorio"),
      numeroCuenta: requiredText("El número de cuenta es obligatorio"),
      titular: requiredText("El titular de la cuenta es obligatorio"),
    }),
    z.object({ type: z.literal("NEQUI"), telefono }),
    z.object({ type: z.literal("DAVIPLATA"), telefono }),
    z.object({ type: z.literal("YAPE_PLIN"), telefono }),
    // Efectivo no requiere datos adicionales.
    z.object({ type: z.literal("EFECTIVO") }),
    z.object({
      type: z.literal("OTRO"),
      descripcion: requiredText("Explica cómo recibes el pago"),
    }),
  ],
  { error: "Selecciona un método de pago disponible" },
);

export const paymentMethodSchema = paymentMethodVariants.transform(
  ({ type, ...details }) => ({ type, details }),
);

export type PaymentMethodInput = z.infer<typeof paymentMethodSchema>;
