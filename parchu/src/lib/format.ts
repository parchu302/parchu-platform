const CURRENCY = new Intl.NumberFormat("es-CO", {
  style: "currency",
  currency: "COP",
  maximumFractionDigits: 0,
});

export function formatPrice(value: number | string): string {
  return CURRENCY.format(Number(value));
}
