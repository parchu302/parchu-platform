// Aritmética monetaria segura sin Prisma.Decimal.
//
// Los importes son numeric(12,2) en la base. Supabase los entrega como number.
// Para evitar errores de coma flotante al sumar/multiplicar, se opera en
// centavos (enteros) y se redondea a 2 decimales al materializar.

export function toCents(value: number | string): number {
  return Math.round(Number(value) * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

/** Redondea un importe a 2 decimales de forma estable. */
export function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

/** unitPrice * quantity, exacto a centavos. */
export function multiplyMoney(unitPrice: number | string, quantity: number): number {
  return fromCents(toCents(unitPrice) * quantity);
}

/** Suma una lista de importes, exacto a centavos. */
export function sumMoney(values: Array<number | string>): number {
  return fromCents(values.reduce<number>((acc, v) => acc + toCents(v), 0));
}
