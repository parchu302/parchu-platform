import type { Decimal } from "@prisma/client/runtime/library";

const CURRENCY = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatPrice(value: Decimal | number | string): string {
  return CURRENCY.format(Number(value));
}
