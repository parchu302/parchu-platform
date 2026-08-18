import { z } from "zod";

export const businessSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(80, "El nombre es demasiado largo"),
  description: z
    .string()
    .trim()
    .min(1, "La descripción es obligatoria")
    .max(500, "La descripción es demasiado larga"),
  category: z
    .string()
    .trim()
    .min(1, "La categoría es obligatoria")
    .max(60, "La categoría es demasiado larga"),
  contactInfo: z
    .string()
    .trim()
    .min(1, "Los datos de contacto son obligatorios")
    .max(200, "Los datos de contacto son demasiado largos"),
});

// Pausar y eliminar son acciones con impacto: el motivo es obligatorio y se
// comunica al emprendedor.
export const reasonSchema = z
  .string()
  .trim()
  .min(1, "El motivo es obligatorio")
  .max(300, "El motivo es demasiado largo");

export type BusinessInput = z.infer<typeof businessSchema>;
