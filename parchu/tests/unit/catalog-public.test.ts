import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  countPublicProducts,
  listPublicCategories,
} from "@/repositories/catalog-repository";
import { getCatalogPage } from "@/services/catalog-service";

const MARKER = "cat4";
const CATEGORY = `Postres ${MARKER}`;
const OTHER_CATEGORY = `Bebidas ${MARKER}`;

let approvedId: string;

async function cleanup() {
  await db.product.deleteMany({
    where: { business: { name: { contains: MARKER } } },
  });
  await db.business.deleteMany({ where: { name: { contains: MARKER } } });
  await db.user.deleteMany({ where: { email: { contains: MARKER } } });
}

async function createBusiness(
  name: string,
  status: "APROBADO" | "PAUSADO",
  deleted = false,
) {
  const owner = await db.user.create({
    data: {
      email: `${name.replace(/\s/g, "")}.${MARKER}@uni.edu`,
      passwordHash: await hashPassword("ClaveSegura1"),
      firstName: "Dueño",
      role: "EMPRENDEDOR",
    },
    select: { id: true },
  });

  const business = await db.business.create({
    data: {
      ownerId: owner.id,
      name,
      description: "d",
      category: "Comida",
      contactInfo: "c",
      status,
      deletedAt: deleted ? new Date() : null,
      deleteReason: deleted ? "motivo" : null,
    },
    select: { id: true },
  });

  return business.id;
}

beforeAll(async () => {
  await cleanup();

  approvedId = await createBusiness(`Aprobado ${MARKER}`, "APROBADO");
  const pausedId = await createBusiness(`Pausado ${MARKER}`, "PAUSADO");
  const deletedId = await createBusiness(`Eliminado ${MARKER}`, "APROBADO", true);

  await db.product.createMany({
    data: [
      // Visibles, con salesCount decreciente.
      { businessId: approvedId, name: "Brownie clásico", price: 6000, category: CATEGORY, stock: 10, salesCount: 100 },
      { businessId: approvedId, name: "Brownie de arequipe", price: 7000, category: CATEGORY, stock: 10, salesCount: 80 },
      { businessId: approvedId, name: "Cheesecake", price: 15000, category: CATEGORY, stock: 5, salesCount: 60 },
      // Mismo termino de busqueda pero en OTRA categoria: prueba el AND.
      { businessId: approvedId, name: "Malteada de brownie", price: 9000, category: OTHER_CATEGORY, stock: 8, salesCount: 90 },
      // No visibles.
      { businessId: approvedId, name: "Oculto", price: 1000, category: CATEGORY, stock: 1, salesCount: 999, status: "OCULTO" },
      { businessId: pausedId, name: "Brownie pausado", price: 6000, category: CATEGORY, stock: 5, salesCount: 500 },
      { businessId: deletedId, name: "Brownie eliminado", price: 6000, category: CATEGORY, stock: 5, salesCount: 500 },
    ],
  });
});

afterAll(cleanup);

describe("catálogo público (Gherkin 4)", () => {
  it("ordena de mayor a menor cantidad de ventas", async () => {
    const result = await getCatalogPage({ category: CATEGORY });

    expect(result.products.map((p) => p.name)).toEqual([
      "Brownie clásico",
      "Brownie de arequipe",
      "Cheesecake",
    ]);
    expect(result.total).toBe(3);
    expect(result.totalPages).toBe(1);
  });

  it("excluye productos ocultos y de emprendimientos pausados o eliminados", async () => {
    const result = await getCatalogPage({ category: CATEGORY });
    const names = result.products.map((p) => p.name);

    expect(names).not.toContain("Oculto");
    expect(names).not.toContain("Brownie pausado");
    expect(names).not.toContain("Brownie eliminado");
  });

  it("busca por nombre de forma parcial e insensible a mayúsculas", async () => {
    const result = await getCatalogPage({ search: "BROWNIE" });
    const names = result.products.map((p) => p.name);

    // Contención, no igualdad: la búsqueda sin categoría también alcanza los
    // productos del seed, que no son de este test.
    expect(names).toEqual(
      expect.arrayContaining([
        "Brownie clásico",
        "Brownie de arequipe",
        "Malteada de brownie",
      ]),
    );
    expect(names).not.toContain("Brownie pausado");
    expect(names).not.toContain("Brownie eliminado");
  });

  it("combina categoría y búsqueda con AND, no con OR", async () => {
    const result = await getCatalogPage({
      category: CATEGORY,
      search: "brownie",
    });

    // "Malteada de brownie" coincide con el término pero es de otra categoría.
    expect(result.products.map((p) => p.name)).toEqual([
      "Brownie clásico",
      "Brownie de arequipe",
    ]);
    expect(result.total).toBe(2);
  });

  it("devuelve cero resultados y ninguna página cuando nada coincide", async () => {
    const result = await getCatalogPage({ search: `pizza-${MARKER}` });

    expect(result.total).toBe(0);
    expect(result.totalPages).toBe(0);
    expect(result.products).toEqual([]);
  });

  it("pagina y mantiene el orden entre páginas", async () => {
    const first = await getCatalogPage({ category: CATEGORY, pageSize: 2 });
    const second = await getCatalogPage({
      category: CATEGORY,
      page: 2,
      pageSize: 2,
    });

    expect(first.totalPages).toBe(2);
    expect(first.products.map((p) => p.name)).toEqual([
      "Brownie clásico",
      "Brownie de arequipe",
    ]);
    expect(second.products.map((p) => p.name)).toEqual(["Cheesecake"]);
  });

  it("acota una página inexistente a la última válida y lo señala", async () => {
    const result = await getCatalogPage({
      category: CATEGORY,
      page: 9,
      pageSize: 2,
    });

    expect(result.requestedPage).toBe(9);
    expect(result.page).toBe(2);
    expect(result.pageOutOfRange).toBe(true);
    expect(result.products).toHaveLength(1);
  });

  it("normaliza páginas inválidas a la primera", async () => {
    for (const page of ["0", "-3", "abc", undefined]) {
      const result = await getCatalogPage({ category: CATEGORY, page });
      expect(result.page).toBe(1);
      expect(result.pageOutOfRange).toBe(false);
    }
  });

  it("lista solo categorías con productos visibles", async () => {
    const categories = await listPublicCategories();

    expect(categories).toContain(CATEGORY);
    expect(categories).toContain(OTHER_CATEGORY);
  });

  // La consulta usa SQL explicito: los valores del usuario deben viajar como
  // parametros, nunca interpolados.
  it("trata comillas y comodines como texto literal, no como SQL ni patrones", async () => {
    for (const search of ["'; DROP TABLE \"Product\"; --", "%", "_", "\\"]) {
      const result = await getCatalogPage({ search });
      expect(result.total).toBe(0);
    }

    // La tabla sigue existiendo y con datos.
    expect(await countPublicProducts({ category: CATEGORY })).toBe(3);
  });
});
