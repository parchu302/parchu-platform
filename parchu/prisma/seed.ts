import { PrismaClient, type BusinessStatus } from "@prisma/client";

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

async function main() {
  await seedAdmin();
  await seedDemoData();
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
