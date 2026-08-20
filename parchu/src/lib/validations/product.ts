import { z } from "zod";

import { isValidProductImage } from "@/lib/image";

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
  // La descripcion y la imagen son los unicos campos opcionales del producto.
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
  // Opcional: cadena vacia cuando el emprendedor no adjunta imagen. Ya llega
  // comprimida y en base64 desde el cliente (ver compress-image.ts); aqui solo
  // se verifica que sea realmente una imagen valida, por si alguien se salta
  // el formulario y hace el POST directo.
  image: z
    .string()
    .refine(
      (value) => value.length === 0 || isValidProductImage(value),
      "El archivo debe ser una imagen válida (JPG, PNG o WEBP)",
    )
    .transform((value) => (value.length === 0 ? undefined : value))
    .optional(),
});

export type ProductInput = z.infer<typeof productSchema>;
