import { PrismaClient, type BusinessStatus, type PaymentType } from "@prisma/client";

import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

// El seed evoluciona por fase (ver plan de implementacion):
//   Fase 1 — usuario ADMIN.
//   Fase 2 (aqui) — emprendedores y emprendimientos en distintos estados.
//   Fase 3 — productos con salesCount variado + formas de pago.
//   Fase 4 — volumen suficiente para paginacion real (>= 25 publicados).
//   Fase 6 — pedidos en cada estado, incluido uno con codeLocked.

const DEMO_PASSWORD = "DemoParchU1";

const DEMO_SELLERS = [
  { email: "cami@uni.edu", firstName: "Camila", lastName: "Rojas" },
  { email: "jd@uni.edu", firstName: "Juan David", lastName: "Marín" },
  { email: "vale@uni.edu", firstName: "Valentina", lastName: "Ospina" },
];

const DEMO_BUSINESSES: {
  ownerEmail: string;
  name: string;
  description: string;
  category: string;
  contactInfo: string;
  status: BusinessStatus;
}[] = [
  {
    ownerEmail: "cami@uni.edu",
    name: "Postres de Cami",
    description: "Brownies, galletas y postres por encargo.",
    category: "Comida",
    contactInfo: "WhatsApp 300 111 2233",
    status: "APROBADO",
  },
  {
    ownerEmail: "jd@uni.edu",
    name: "Impresiones JD",
    description: "Impresiones, anillados y diseño de trabajos.",
    category: "Diseño & impresiones",
    contactInfo: "Bloque 3, primer piso",
    status: "APROBADO",
  },
  {
    ownerEmail: "vale@uni.edu",
    name: "Uñas por Vale",
    description: "Manicure express dentro o cerca del campus.",
    category: "Belleza",
    contactInfo: "WhatsApp 300 444 5566",
    status: "PENDIENTE",
  },
  {
    ownerEmail: "cami@uni.edu",
    name: "Vintage del Bloque 4",
    description: "Ropa de segunda seleccionada.",
    category: "Ropa & accesorios",
    contactInfo: "Bloque 4, cafetería",
    status: "PAUSADO",
  },
];

async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Faltan ADMIN_EMAIL y/o ADMIN_PASSWORD. Definelos en .env (ver .env.example).",
    );
  }

  const passwordHash = await hashPassword(password);

  // La cuenta de administrador se crea por base de datos, nunca por UI.
  const admin = await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, role: "ADMIN" },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      firstName: "Administración",
      lastName: "ParchU",
      role: "ADMIN",
    },
    select: { email: true },
  });

  // Nunca se registra la contrasena, ni siquiera en el log del seed.
  console.log(`seed: administrador listo (${admin.email}).`);
}

async function seedDemoData() {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const ownerIdByEmail = new Map<string, string>();
  for (const seller of DEMO_SELLERS) {
    const user = await prisma.user.upsert({
      where: { email: seller.email },
      update: {},
      create: { ...seller, passwordHash, role: "EMPRENDEDOR" },
      select: { id: true, email: true },
    });
    ownerIdByEmail.set(user.email, user.id);
  }

  for (const business of DEMO_BUSINESSES) {
    const ownerId = ownerIdByEmail.get(business.ownerEmail);
    if (!ownerId) continue;

    await prisma.business.upsert({
      where: { name: business.name },
      update: { status: business.status, deletedAt: null },
      create: {
        name: business.name,
        description: business.description,
        category: business.category,
        contactInfo: business.contactInfo,
        status: business.status,
        ownerId,
      },
    });
  }

  const byStatus = await prisma.business.groupBy({
    by: ["status"],
    _count: true,
    where: { deletedAt: null },
  });

  console.log(
    `seed: ${DEMO_SELLERS.length} emprendedores y ${DEMO_BUSINESSES.length} emprendimientos ` +
      `(${byStatus.map((row) => `${row.status}=${row._count}`).join(", ")}).`,
  );
}

// salesCount se siembra directamente: el flujo real de ventas no existe hasta
// las Fases 5 y 6, pero la Fase 4 necesita variedad para probar el orden por
// "mas vendidos". Incluye a proposito productos de un emprendimiento PAUSADO,
// que el catalogo publico debe excluir.
const DEMO_PRODUCTS: {
  id: string;
  businessName: string;
  name: string;
  description: string;
  price: number;
  category: string;
  stock: number;
  salesCount: number;
}[] = [
  {
    id: "seed_prod_brownie",
    businessName: "Postres de Cami",
    name: "Brownie",
    description: "Brownie de chocolate con nueces.",
    price: 6000,
    category: "Comida",
    stock: 40,
    salesCount: 128,
  },
  {
    id: "seed_prod_galletas",
    businessName: "Postres de Cami",
    name: "Galletas",
    description: "Paquete de seis galletas.",
    price: 8000,
    category: "Comida",
    stock: 25,
    salesCount: 74,
  },
  {
    id: "seed_prod_cheesecake",
    businessName: "Postres de Cami",
    name: "Cheesecake",
    description: "Porción individual.",
    price: 15000,
    category: "Comida",
    stock: 12,
    salesCount: 31,
  },
  {
    id: "seed_prod_impresion",
    businessName: "Impresiones JD",
    name: "Impresión B/N",
    description: "Por hoja, entrega inmediata.",
    price: 2000,
    category: "Diseño & impresiones",
    stock: 500,
    salesCount: 96,
  },
  {
    id: "seed_prod_anillado",
    businessName: "Impresiones JD",
    name: "Anillado",
    description: "Hasta 200 hojas.",
    price: 9000,
    category: "Diseño & impresiones",
    stock: 60,
    salesCount: 18,
  },
  {
    // Emprendimiento PAUSADO: caso negativo del catálogo público (Fase 4).
    id: "seed_prod_vintage",
    businessName: "Vintage del Bloque 4",
    name: "Prenda seleccionada",
    description: "Ropa de segunda en buen estado.",
    price: 15000,
    category: "Ropa & accesorios",
    stock: 20,
    salesCount: 55,
  },
];

const DEMO_PAYMENT_METHODS: {
  id: string;
  businessName: string;
  type: PaymentType;
  details: Record<string, string>;
}[] = [
  {
    id: "seed_pay_cami_nequi",
    businessName: "Postres de Cami",
    type: "NEQUI",
    details: { telefono: "300 111 2233" },
  },
  {
    id: "seed_pay_cami_efectivo",
    businessName: "Postres de Cami",
    type: "EFECTIVO",
    details: {},
  },
  {
    id: "seed_pay_jd_transferencia",
    businessName: "Impresiones JD",
    type: "TRANSFERENCIA",
    details: {
      banco: "Bancolombia",
      numeroCuenta: "000-000000-00",
      titular: "Juan David Marín",
    },
  },
];

async function seedCatalog() {
  const businessIdByName = new Map<string, string>();
  for (const business of await prisma.business.findMany({
    select: { id: true, name: true },
  })) {
    businessIdByName.set(business.name, business.id);
  }

  for (const product of DEMO_PRODUCTS) {
    const businessId = businessIdByName.get(product.businessName);
    if (!businessId) continue;

    await prisma.product.upsert({
      where: { id: product.id },
      update: { price: product.price, stock: product.stock, salesCount: product.salesCount },
      create: {
        id: product.id,
        businessId,
        name: product.name,
        description: product.description,
        price: product.price,
        category: product.category,
        stock: product.stock,
        salesCount: product.salesCount,
      },
    });
  }

  for (const method of DEMO_PAYMENT_METHODS) {
    const businessId = businessIdByName.get(method.businessName);
    if (!businessId) continue;

    await prisma.paymentMethod.upsert({
      where: { id: method.id },
      update: { details: method.details },
      create: {
        id: method.id,
        businessId,
        type: method.type,
        details: method.details,
      },
    });
  }

  const visibles = await prisma.product.count({
    where: {
      status: "PUBLICADO",
      business: { status: "APROBADO", deletedAt: null },
    },
  });

  console.log(
    `seed: ${DEMO_PRODUCTS.length} productos y ${DEMO_PAYMENT_METHODS.length} formas de pago ` +
      `(${visibles} productos visibles en el catálogo público).`,
  );
}

async function main() {
  await seedAdmin();
  await seedDemoData();
  await seedCatalog();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
