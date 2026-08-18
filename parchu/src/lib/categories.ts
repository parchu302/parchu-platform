// Catalogo configurable de categorias (mismas del tablero del landing).
export const BUSINESS_CATEGORIES = [
  "Comida",
  "Ropa & accesorios",
  "Tecnología",
  "Diseño & impresiones",
  "Tutorías",
  "Belleza",
  "Otros",
] as const;

export type BusinessCategory = (typeof BUSINESS_CATEGORIES)[number];
