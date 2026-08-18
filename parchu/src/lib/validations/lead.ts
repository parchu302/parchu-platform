import { z } from "zod";

// Entrada externa = pasiva: se valida antes de tocar la base de datos.
export const sellerLeadSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(120, "El nombre es demasiado largo"),
  whatsapp: z
    .string()
    .trim()
    .min(7, "Ingresa un número de WhatsApp válido")
    .max(25, "Ingresa un número de WhatsApp válido")
    .regex(/^[\d+()\s-]+$/, "El número solo puede tener dígitos, espacios y + ( ) -"),
  sells: z
    .string()
    .trim()
    .min(1, "Cuéntanos qué vendes")
    .max(200, "La descripción es demasiado larga"),
});

export type SellerLeadInput = z.infer<typeof sellerLeadSchema>;
