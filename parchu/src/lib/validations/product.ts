import { z } from "zod";

// Los valores llegan como texto desde FormData: se convierten y se validan
// aqui, en el borde, antes de tocar la base de datos.
function numericField(options: {
  requiredMessage: string;
  invalidMessage: string;
  integer?: boolean;
}) {
  const base = z
    .string()
    .trim()
    .min(1, options.requiredMessage)
    .transform((value) => Number(value.replace(",", ".")))
    .refine((value) => Number.isFinite(value), options.invalidMessage)
    .refine((value) => value >= 0, "El valor debe ser mayor o igual a cero");

  return options.integer
    ? base.refine((value) => Number.isInteger(value), options.invalidMessage)
    : base;
}

export const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(80, "El nombre es demasiado largo"),
  // La descripcion es el unico campo opcional del producto.
  description: z
    .string()
    .trim()
    .max(500, "La descripción es demasiado larga")
    .optional(),
  price: numericField({
    requiredMessage: "El precio es obligatorio",
    invalidMessage: "El precio debe ser un número",
  }),
  category: z
    .string()
    .trim()
    .min(1, "La categoría es obligatoria")
    .max(60, "La categoría es demasiado larga"),
  stock: numericField({
    requiredMessage: "El stock es obligatorio",
    invalidMessage: "El stock debe ser un número entero",
    integer: true,
  }),
});

export type ProductInput = z.infer<typeof productSchema>;
