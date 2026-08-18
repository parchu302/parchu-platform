import { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export type CatalogProduct = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  category: string;
  stock: number;
  salesCount: number;
  businessId: string;
  businessName: string;
};

export type CatalogQuery = {
  category?: string;
  search?: string;
  page: number;
  pageSize: number;
};

// Path critico de lectura: se resuelve con SQL explicito y parametrizado en vez
// de con el ORM. Los valores del usuario viajan SIEMPRE como parametros de
// Prisma.sql (nunca interpolados en el texto de la consulta).
//
// La visibilidad publica exige las tres condiciones a la vez: producto
// publicado, emprendimiento aprobado y no dado de baja.
function visibilityConditions(query: {
  category?: string;
  search?: string;
}): Prisma.Sql {
  const conditions: Prisma.Sql[] = [
    // El cast al enum mantiene utilizable el indice (status, salesCount DESC).
    Prisma.sql`p."status" = 'PUBLICADO'::"ProductStatus"`,
    Prisma.sql`b."status" = 'APROBADO'::"BusinessStatus"`,
    Prisma.sql`b."deletedAt" IS NULL`,
  ];

  if (query.category) {
    conditions.push(Prisma.sql`p."category" = ${query.category}`);
  }

  if (query.search) {
    // ILIKE = coincidencia parcial insensible a mayusculas. Se escapan los
    // comodines para que un termino como "50%" se busque literalmente.
    conditions.push(
      Prisma.sql`p."name" ILIKE ${`%${escapeLikePattern(query.search)}%`} ESCAPE '\\'`,
    );
  }

  return Prisma.join(conditions, " AND ");
}

function escapeLikePattern(value: string): string {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

export async function countPublicProducts(query: {
  category?: string;
  search?: string;
}): Promise<number> {
  const rows = await db.$queryRaw<{ total: bigint }[]>`
    SELECT COUNT(*)::bigint AS total
    FROM "Product" p
    JOIN "Business" b ON b."id" = p."businessId"
    WHERE ${visibilityConditions(query)}
  `;

  return Number(rows[0]?.total ?? 0);
}

export async function findPublicProducts(
  query: CatalogQuery,
): Promise<CatalogProduct[]> {
  const offset = (query.page - 1) * query.pageSize;

  // Orden por mas vendidos; el nombre desempata para que la paginacion sea
  // estable entre paginas (sin desempate, dos filas con el mismo salesCount
  // podrian repetirse u omitirse al cambiar de pagina).
  return db.$queryRaw<CatalogProduct[]>`
    SELECT
      p."id",
      p."name",
      p."description",
      p."price"::text AS "price",
      p."category",
      p."stock",
      p."salesCount",
      b."id" AS "businessId",
      b."name" AS "businessName"
    FROM "Product" p
    JOIN "Business" b ON b."id" = p."businessId"
    WHERE ${visibilityConditions(query)}
    ORDER BY p."salesCount" DESC, p."name" ASC
    LIMIT ${query.pageSize} OFFSET ${offset}
  `;
}

// Categorias realmente presentes en el catalogo visible: el filtro no ofrece
// opciones que no devolverian nada.
export async function listPublicCategories(): Promise<string[]> {
  const rows = await db.$queryRaw<{ category: string }[]>`
    SELECT DISTINCT p."category"
    FROM "Product" p
    JOIN "Business" b ON b."id" = p."businessId"
    WHERE ${visibilityConditions({})}
    ORDER BY p."category" ASC
  `;

  return rows.map((row) => row.category);
}

export async function findTopSellingProducts(
  limit: number,
): Promise<CatalogProduct[]> {
  return findPublicProducts({ page: 1, pageSize: limit });
}
