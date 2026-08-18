import { z } from "zod";

// Politica de contrasena: longitud minima, una mayuscula y un numero.
// El primer issue reportado es el de "obligatoria" cuando viene vacia, que es
// lo que exige el escenario de campos obligatorios faltantes.
const passwordSchema = z
  .string()
  .min(1, "La contraseña es obligatoria")
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .regex(/[A-Z]/, "La contraseña debe incluir al menos una mayúscula")
  .regex(/\d/, "La contraseña debe incluir al menos un número");

// El pipe separa "campo vacío" de "formato inválido": sin el, un correo vacío
// reportaria error de formato en vez de campo obligatorio.
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "El correo es obligatorio")
  .pipe(z.email("El formato del correo es inválido"));

export const registerSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(80, "El nombre es demasiado largo"),
  // El apellido no esta entre los campos obligatorios del caso de uso.
  lastName: z.string().trim().max(80, "El apellido es demasiado largo").optional(),
  email: emailSchema,
  password: passwordSchema,
});

// En login no se aplica la politica de contrasena: una clave que no la cumple
// simplemente no coincidira, y validarla aqui filtraria informacion.
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().min(1, "El correo es obligatorio"),
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
