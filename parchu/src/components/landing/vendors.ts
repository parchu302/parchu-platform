// Datos de ejemplo del landing original (ParchU_marketplace_v2.html).
// Fase 0: siguen siendo mock a proposito. El tablero se conecta a
// productos reales en la Fase 4, via catalog-repository.
export type VendorProduct = {
  name: string;
  price: string;
};

export type Vendor = {
  id: string;
  category: string;
  name: string;
  teaser: string;
  priceLabel: string;
  description: string;
  phone: string;
  products: VendorProduct[];
};

export const CATEGORIES = [
  "Todos",
  "Comida",
  "Ropa & accesorios",
  "Tecnología",
  "Diseño & impresiones",
  "Tutorías",
  "Belleza",
] as const;

export const VENDORS: Vendor[] = [
  {
    id: "cami",
    category: "Comida",
    name: "Postres de Cami",
    teaser: "Brownies, galletas y postres por encargo. Entrega en el campus.",
    priceLabel: "desde $6.000",
    description:
      "Brownies, galletas y postres por encargo. Entrega el mismo día en el campus.",
    phone: "573178727517",
    products: [
      { name: "Brownie", price: "$6.000" },
      { name: "Galletas", price: "$8.000" },
      { name: "Cheesecake", price: "$15.000" },
    ],
  },
  {
    id: "reparacel",
    category: "Tecnología",
    name: "ReparaCel U",
    teaser: "Cambio de pantalla, baterías y accesorios para celulares.",
    priceLabel: "desde $40.000",
    description: "Reparación y accesorios para celulares.",
    phone: "573178727517",
    products: [
      { name: "Cambio de pantalla", price: "Consultar" },
      { name: "Cambio de batería", price: "Consultar" },
      { name: "Accesorios", price: "Consultar" },
    ],
  },
  {
    id: "impresiones",
    category: "Diseño & impresiones",
    name: "Impresiones JD",
    teaser: "Anillados, impresiones a color y diseño de portadas.",
    priceLabel: "desde $2.000",
    description: "Impresiones, anillados y diseño de trabajos.",
    phone: "573178727517",
    products: [
      { name: "Impresión B/N", price: "$2.000" },
      { name: "Impresión a color", price: "Consultar" },
      { name: "Anillado", price: "Consultar" },
    ],
  },
  {
    id: "vintage",
    category: "Ropa & accesorios",
    name: "Vintage del Bloque 4",
    teaser: "Ropa de segunda seleccionada y catálogo renovado.",
    priceLabel: "desde $15.000",
    description: "Ropa de segunda seleccionada.",
    phone: "573178727517",
    products: [{ name: "Prendas seleccionadas", price: "Desde $15.000" }],
  },
  {
    id: "unas",
    category: "Belleza",
    name: "Uñas por Vale",
    teaser: "Manicure express en tu residencia o punto de encuentro.",
    priceLabel: "desde $18.000",
    description: "Manicure express dentro o cerca del campus.",
    phone: "573178727517",
    products: [
      { name: "Manicure", price: "$18.000" },
      { name: "Diseño de uñas", price: "Consultar" },
    ],
  },
  {
    id: "calculo",
    category: "Tutorías",
    name: "Cálculo con Db",
    teaser: "Asesorías express antes de parcial, presencial o virtual.",
    priceLabel: "desde $20.000/h",
    description:
      "Asesorías de cálculo antes de parciales, presenciales o virtuales.",
    phone: "573178727517",
    products: [{ name: "Tutoría de cálculo", price: "$20.000/h" }],
  },
];

export function whatsappUrl(vendor: Vendor): string {
  const text = encodeURIComponent(
    `Hola, vi ${vendor.name} en ParchU y quiero hacer un pedido.`,
  );
  return `https://wa.me/${vendor.phone}?text=${text}`;
}
