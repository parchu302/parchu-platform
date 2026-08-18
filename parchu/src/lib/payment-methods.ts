import type { PaymentType } from "@prisma/client";

export type PaymentFieldSpec = {
  name: string;
  label: string;
  placeholder?: string;
};

// Catalogo configurable: que datos exige cada metodo. Lo consumen tanto el
// formulario (para renderizar los campos) como la validacion (para exigirlos),
// de modo que no puedan quedar desalineados.
export const PAYMENT_METHOD_LABEL: Record<PaymentType, string> = {
  TRANSFERENCIA: "Transferencia bancaria",
  NEQUI: "Nequi",
  DAVIPLATA: "Daviplata",
  YAPE_PLIN: "Yape / Plin",
  EFECTIVO: "Efectivo",
  OTRO: "Otro",
};

export const PAYMENT_METHOD_FIELDS: Record<PaymentType, PaymentFieldSpec[]> = {
  TRANSFERENCIA: [
    { name: "banco", label: "Banco", placeholder: "Bancolombia" },
    { name: "numeroCuenta", label: "Número de cuenta", placeholder: "000-000000-00" },
    { name: "titular", label: "Titular de la cuenta", placeholder: "Ana Pérez" },
  ],
  NEQUI: [{ name: "telefono", label: "Teléfono", placeholder: "300 000 0000" }],
  DAVIPLATA: [{ name: "telefono", label: "Teléfono", placeholder: "300 000 0000" }],
  YAPE_PLIN: [{ name: "telefono", label: "Teléfono", placeholder: "900 000 000" }],
  EFECTIVO: [],
  OTRO: [
    {
      name: "descripcion",
      label: "Cómo recibes el pago",
      placeholder: "Explícalo para tus clientes",
    },
  ],
};

export const PAYMENT_TYPES = Object.keys(
  PAYMENT_METHOD_LABEL,
) as PaymentType[];
