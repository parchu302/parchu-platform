import type { PaymentType } from "@prisma/client";

import { PAYMENT_METHOD_FIELDS } from "@/lib/payment-methods";

// Se usa tanto en el checkout (al elegir la forma de pago) como en
// /seguimiento/[token] (para que el cliente pueda volver a consultarlo). Sin
// interactividad propia, por eso no es "use client".
export function PaymentInstructions({
  label,
  type,
  details,
}: {
  label: string;
  type: PaymentType;
  details: Record<string, string>;
}) {
  // EFECTIVO no tiene campos declarados: esto cubre "cualquier metodo
  // distinto de efectivo" sin comparar el tipo a mano.
  const fields = PAYMENT_METHOD_FIELDS[type];
  if (fields.length === 0) return null;

  return (
    <div
      data-testid="payment-instructions"
      className="mt-3 rounded border-2 border-teal bg-teal/10 px-3.5 py-3 text-[13.5px]"
    >
      <p className="mb-1.5 font-bold text-teal">Datos para pagar por {label}</p>
      <ul className="grid list-none gap-1 p-0">
        {fields.map((field) => (
          <li key={field.name}>
            <span className="text-ink/70">{field.label}: </span>
            <span className="font-semibold">{details[field.name] ?? ""}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
