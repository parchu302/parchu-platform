import { expect, type Page } from "@playwright/test";

import { db } from "@/lib/db";
import { CATALOG_PAGE_SIZE } from "@/services/catalog-service";

import { Given, Then, When } from "./world";

// Categoría del seed con 45 productos: exactamente 3 páginas de 20.
const PAGINATION_CATEGORY = "Bazar del campus";

// Los valores esperados se calculan contra la base de datos en el momento de
// aseverar, no se fijan a mano: así el test no se rompe cuando otros
// escenarios agregan productos.
const VISIBLE = {
  status: "PUBLICADO",
  business: { status: "APROBADO", deletedAt: null },
} as const;

async function countVisible(where: object = {}) {
  return db.product.count({ where: { ...VISIBLE, ...where } });
}

async function renderedNames(page: Page): Promise<string[]> {
  return page
    .locator("[data-product-name]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-product-name") ?? ""),
    );
}

async function renderedCategories(page: Page): Promise<string[]> {
  return page
    .locator("[data-product-category]")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-product-category") ?? ""),
    );
}

async function expectTotals(page: Page, where: object = {}) {
  const total = await countVisible(where);
  const totalPages = Math.ceil(total / CATALOG_PAGE_SIZE);

  await expect(page.getByTestId("catalog-total")).toHaveText(String(total));
  await expect(page.getByTestId("catalog-total-pages")).toHaveText(
    String(totalPages),
  );
}

async function expectOrderedBySales(page: Page) {
  const names = await renderedNames(page);
  expect(names.length).toBeGreaterThan(0);

  const products = await db.product.findMany({
    where: { name: { in: names } },
    select: { name: true, salesCount: true },
  });
  const salesByName = new Map(products.map((p) => [p.name, p.salesCount]));
  const rendered = names.map((name) => salesByName.get(name) ?? 0);

  expect(rendered).toEqual([...rendered].sort((a, b) => b - a));
}

async function searchFor(page: Page, term: string) {
  await page.locator("#catalog-search").fill(term);
  await page.getByRole("button", { name: "Buscar" }).click();
  await page.waitForURL(/\/productos\?/);
}

// ---------- Dado ----------

Given(
  "que el cliente accede al sistema sin haber iniciado sesión",
  async ({ page }) => {
    await page.context().clearCookies();
    await page.goto("/productos");
  },
);

Given(
  "el sistema muestra los resultados en páginas de 20 productos",
  async () => {
    expect(CATALOG_PAGE_SIZE).toBe(20);
  },
);

Given("que el cliente no ha aplicado ningún filtro de categoría", async () => {});
Given("no ha ingresado ningún término de búsqueda", async () => {});

Given(
  "que el cliente ha seleccionado la categoría {string}",
  async ({ page }, category: string) => {
    await page.goto(`/productos?categoria=${encodeURIComponent(category)}`);
  },
);

Given(
  "que el resultado actual tiene más de una página de productos",
  async ({ page }) => {
    await page.goto(
      `/productos?categoria=${encodeURIComponent(PAGINATION_CATEGORY)}`,
    );

    const total = await countVisible({ category: PAGINATION_CATEGORY });
    expect(Math.ceil(total / CATALOG_PAGE_SIZE)).toBeGreaterThan(1);
  },
);

Given("el cliente se encuentra en la página 1", async ({ page }) => {
  await expect(page.getByTestId("pagination-status")).toContainText("Página 1");
});

Given(
  "que el resultado actual tiene un total de 3 páginas",
  async ({ page }) => {
    await page.goto(
      `/productos?categoria=${encodeURIComponent(PAGINATION_CATEGORY)}`,
    );

    await expect(page.getByTestId("catalog-total-pages")).toHaveText("3");
  },
);

Given(
  "que el cliente se encuentra en una página distinta a la 1",
  async ({ page }) => {
    await page.goto(
      `/productos?categoria=${encodeURIComponent(PAGINATION_CATEGORY)}&page=2`,
    );

    await expect(page.getByTestId("pagination-status")).toContainText(
      "Página 2",
    );
  },
);

Given(
  "que el cliente tiene un filtro de categoría o un término de búsqueda activo",
  async ({ page }) => {
    await page.goto("/productos?categoria=Postres&q=brownie");

    await expect(page.getByTestId("catalog-clear")).toBeVisible();
  },
);

// ---------- Cuando ----------

When("el cliente ingresa a la vista de productos", async ({ page }) => {
  await page.goto("/productos");
});

When(
  "el cliente selecciona la categoría {string}",
  async ({ page }, category: string) => {
    await page.goto("/productos");
    await page.locator(`[data-category="${category}"]`).click();
    await page.waitForURL(/categoria=/);
  },
);

When("el cliente ingresa {string} en el buscador", async ({ page }, term: string) => {
  await searchFor(page, term);
});

When(
  "ningún producto publicado coincide con ese término",
  async ({ page }) => {
    const url = new URL(page.url());
    const term = url.searchParams.get("q") ?? "";

    expect(
      await countVisible({ name: { contains: term, mode: "insensitive" } }),
    ).toBe(0);
  },
);

When("el cliente navega a la página siguiente", async ({ page }) => {
  await page.getByTestId("pagination-next").click();
  await page.waitForURL(/page=2/);
});

When("el cliente intenta acceder a la página 4", async ({ page }) => {
  await page.goto(
    `/productos?categoria=${encodeURIComponent(PAGINATION_CATEGORY)}&page=4`,
  );
});

When("el cliente aplica un nuevo filtro de categoría", async ({ page }) => {
  await page.locator('[data-category="Postres"]').click();
  await page.waitForURL(/categoria=Postres/);
});

When("el cliente limpia los filtros y la búsqueda", async ({ page }) => {
  await page.getByTestId("catalog-clear").click();
  await page.waitForURL((url) => url.pathname === "/productos" && !url.search);
});

// ---------- Entonces ----------

Then(
  "el sistema muestra la primera página de productos publicados",
  async ({ page }) => {
    await expect(page).toHaveURL(/\/productos$/);

    const names = await renderedNames(page);
    expect(names.length).toBeGreaterThan(0);
    expect(names.length).toBeLessThanOrEqual(CATALOG_PAGE_SIZE);

    // Ninguno de un emprendimiento no visible.
    const visibles = await db.product.count({
      where: { ...VISIBLE, name: { in: names } },
    });
    expect(visibles).toBe(names.length);
  },
);

Then("los ordena de mayor a menor cantidad de ventas", async ({ page }) => {
  await expectOrderedBySales(page);
});

Then(
  "muestra el total de productos encontrados y el total de páginas disponibles",
  async ({ page }) => {
    const url = new URL(page.url());
    const category = url.searchParams.get("categoria") ?? undefined;
    const search = url.searchParams.get("q") ?? undefined;

    await expectTotals(page, {
      ...(category ? { category } : {}),
      ...(search ? { name: { contains: search, mode: "insensitive" } } : {}),
    });
  },
);

Then(
  "el sistema muestra la primera página de productos publicados que pertenecen a la categoría {string}",
  async ({ page }, category: string) => {
    const categories = await renderedCategories(page);

    expect(categories.length).toBeGreaterThan(0);
    expect(new Set(categories)).toEqual(new Set([category]));
  },
);

Then(
  "el sistema muestra la primera página de productos publicados cuyo nombre contiene {string}",
  async ({ page }, term: string) => {
    const names = await renderedNames(page);

    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      expect(name.toLowerCase()).toContain(term.toLowerCase());
    }
  },
);

Then("cuyo nombre contiene {string}", async ({ page }, term: string) => {
  const names = await renderedNames(page);

  expect(names.length).toBeGreaterThan(0);
  for (const name of names) {
    expect(name.toLowerCase()).toContain(term.toLowerCase());
  }
});

Then(
  "el sistema muestra un mensaje indicando que no se encontraron productos",
  async ({ page }) => {
    await expect(page.getByTestId("catalog-empty")).toContainText(
      /no se encontraron productos/i,
    );
  },
);

Then("no muestra controles de paginación", async ({ page }) => {
  await expect(page.getByTestId("pagination")).toHaveCount(0);
});

Then("el sistema muestra la página 2 de resultados", async ({ page }) => {
  await expect(page.getByTestId("pagination-status")).toContainText("Página 2");
});

Then(
  "mantiene los filtros, la búsqueda y el orden aplicados",
  async ({ page }) => {
    const url = new URL(page.url());
    expect(url.searchParams.get("categoria")).toBe(PAGINATION_CATEGORY);

    await expectOrderedBySales(page);
  },
);

Then(
  "el sistema muestra un error indicando que la página solicitada no existe",
  async ({ page }) => {
    await expect(page.getByTestId("catalog-page-error")).toContainText(
      /no existe/i,
    );
  },
);

Then("permanece en la última página válida", async ({ page }) => {
  await expect(page.getByTestId("pagination-status")).toContainText(
    "Página 3 de 3",
  );
});

Then(
  "el sistema muestra la primera página de los resultados actualizados",
  async ({ page }) => {
    const url = new URL(page.url());

    // Sin parámetro `page`: se volvió a la primera.
    expect(url.searchParams.get("page")).toBeNull();
    expect(url.searchParams.get("categoria")).toBe("Postres");
  },
);

Then(
  "el sistema muestra la primera página de todos los productos publicados",
  async ({ page }) => {
    const url = new URL(page.url());
    expect(url.searchParams.get("categoria")).toBeNull();
    expect(url.searchParams.get("q")).toBeNull();

    await expectTotals(page);
  },
);
