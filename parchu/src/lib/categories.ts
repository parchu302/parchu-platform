// Catalogo configurable de categorias.

// De emprendimiento: las mismas del tablero del landing.
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

// De producto: mas fina que la del emprendimiento (un negocio de "Comida"
// puede vender postres y bebidas por separado).
export const PRODUCT_CATEGORIES = [
  "Comida",
  "Postres",
  "Bebidas",
  "Ropa & accesorios",
  "Tecnología",
  "Diseño & impresiones",
  "Tutorías",
  "Belleza",
  "Otros",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];
