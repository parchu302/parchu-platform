import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// El seed evoluciona por fase (ver plan de implementacion):
//   Fase 0 — esqueleto (aqui): sin datos de negocio.
//   Fase 1 — usuario ADMIN (requiere el hash argon2id, aun no disponible).
//   Fase 2 — emprendimientos en PENDIENTE / APROBADO / PAUSADO.
//   Fase 3 — productos con salesCount variado + formas de pago.
//   Fase 4 — volumen suficiente para paginacion real (>= 25 publicados).
//   Fase 6 — pedidos en cada estado, incluido uno con codeLocked.
async function main() {
  const leads = await prisma.sellerLead.count();
  console.log(`seed: Fase 0 — sin datos de negocio que sembrar. SellerLead actuales: ${leads}.`);
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
