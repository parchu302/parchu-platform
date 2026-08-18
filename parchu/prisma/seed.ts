import { PrismaClient } from "@prisma/client";

import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

// El seed evoluciona por fase (ver plan de implementacion):
//   Fase 1 (aqui) — usuario ADMIN.
//   Fase 2 — emprendimientos en PENDIENTE / APROBADO / PAUSADO.
//   Fase 3 — productos con salesCount variado + formas de pago.
//   Fase 4 — volumen suficiente para paginacion real (>= 25 publicados).
//   Fase 6 — pedidos en cada estado, incluido uno con codeLocked.

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
    select: { id: true, email: true },
  });

  // Nunca se registra la contrasena, ni siquiera en el log del seed.
  console.log(`seed: administrador listo (${admin.email}).`);
}

async function main() {
  await seedAdmin();
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
