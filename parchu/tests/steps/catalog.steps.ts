import path from "node:path";

import { expect, type Page } from "@playwright/test";
import type { BusinessStatus } from "@prisma/client";

import { db } from "@/lib/db";

import { deleteBusinessesCascade, ensureUser } from "./helpers";
import { Given, Then, When } from "./world";

const VALID_IMAGE_PATH = path.join(process.cwd(), "tests/fixtures/product-image.png");
const NOT_AN_IMAGE_PATH = path.join(process.cwd(), "tests/fixtures/not-an-image.txt");

const MARKER = "E2E";
const EMPRENDEDOR_EMAIL = "emprendedor.e2e@uni.edu";
const BUSINESS_NAME = `Catálogo ${MARKER}`;
const PRODUCT_NAME = `Brownie ${MARKER}`;

const STATUS_BY_LABEL: Record<string, BusinessStatus> = {
  "Pendiente de aprobación": "PENDIENTE",
  Aprobado: "APROBADO",
  Pausado: "PAUSADO",
};

const VALID_PRODUCT = {
  name: PRODUCT_NAME,
  description: "Con nueces",
  price: "6000",
  category: "Comida",
  stock: "10",
};

// El registro de producto y de forma de pago no navega: hay que esperar al
// mensaje de resultado o a los errores de campo.
async function waitForCatalogOutcome(page: Page) {
  await expect
    .poll(
      async () =>
        (await page
          .locator("[data-testid='catalog-message'], [data-field-error]")
          .count()) > 0,
      { timeout: 15_000 },
    )
    .toBe(true);
}

async function createBusinessWithStatus(status: BusinessStatus) {
  const ownerId = await ensureUser(EMPRENDEDOR_EMAIL);

  await deleteBusinessesCascade({ name: { contains: MARKER } });

  return db.business.create({
    data: {
      ownerId,
      name: BUSINESS_NAME,
      description: "descripción",
      category: "Comida",
      contactInfo: "300 000 0000",
      status,
    },
    select: { id: true },
  });
}

async function fillProductForm(
  page: Page,
  overrides: Partial<typeof VALID_PRODUCT> = {},
) {
  const values = { ...VALID_PRODUCT, ...overrides };
  await page.locator("#product-name").fill(values.name);
  await page.locator("#product-description").fill(values.description);
  await page.locator("#product-price").fill(values.price);
  await page.locator("#product-stock").fill(values.stock);
  await page.locator("#product-category").selectOption(values.category);
}

// ---------- Dado ----------

Given(
  "ha seleccionado uno de sus emprendimientos con estado {string}",
  async ({ page, state }, statusLabel: string) => {
    const business = await createBusinessWithStatus(
      STATUS_BY_LABEL[statusLabel]!,
    );

    state.businessId = business.id;
    state.businessName = BUSINESS_NAME;
    state.formKind = "product";

    await page.goto(`/panel/${business.id}/productos`);
  },
);

Given(
  "que el emprendedor ha seleccionado un emprendimiento con estado {string}",
  async ({ state }, statusLabel: string) => {
    const business = await createBusinessWithStatus(
      STATUS_BY_LABEL[statusLabel]!,
    );

    state.businessId = business.id;
    state.businessName = BUSINESS_NAME;
    state.formKind = "product";
  },
);

// ---------- Cuando ----------

When(
  "el emprendedor completa el formulario con nombre, descripción, precio, categoría y stock del producto",
  async ({ page, state }) => {
    state.formKind = "product";
    await fillProductForm(page);
  },
);

When(
  "el emprendedor completa el formulario del producto dejando vacío el campo {string}",
  async ({ page, state }, campo: string) => {
    state.formKind = "product";

    await fillProductForm(page, {
      name: campo === "nombre" ? "" : VALID_PRODUCT.name,
      price: campo === "precio" ? "" : VALID_PRODUCT.price,
      stock: campo === "stock" ? "" : VALID_PRODUCT.stock,
      category: campo === "categoría" ? "" : VALID_PRODUCT.category,
    });
  },
);

When(
  "el emprendedor completa el formulario del producto con un precio o stock negativo",
  async ({ page, state }) => {
    state.formKind = "product";
    await fillProductForm(page, { price: "-1", stock: "-5" });
  },
);

When("confirma el registro del producto", async ({ page }) => {
  await page.getByRole("button", { name: /publicar producto/i }).click();
  await waitForCatalogOutcome(page);
});

When("adjunta una imagen válida del producto", async ({ page }) => {
  await page.locator("#product-image").setInputFiles(VALID_IMAGE_PATH);
  // La compresion en canvas es asincrona: se espera la vista previa antes de
  // confirmar, para que el campo oculto ya tenga el data URL comprimido.
  await expect(
    page.getByAltText("Vista previa del producto"),
  ).toBeVisible();
});

When("adjunta un archivo que no es una imagen válida", async ({ page }) => {
  await page.locator("#product-image").setInputFiles(NOT_AN_IMAGE_PATH);
  await expect(page.locator("#product-image-error")).toBeVisible();
});

When(
  "el emprendedor selecciona un método de pago disponible",
  async ({ page, state }) => {
    state.formKind = "payment";
    await page.goto(`/panel/${state.businessId}/pagos`);
    // Transferencia exige tres datos: sirve para ambos escenarios.
    await page.locator("#payment-type").selectOption("TRANSFERENCIA");
  },
);

When("completa los datos requeridos para ese método", async ({ page }) => {
  await page.locator("#payment-banco").fill("Bancolombia");
  await page.locator("#payment-numeroCuenta").fill("000-000000-00");
  await page.locator("#payment-titular").fill("Ana Pérez");
});

When(
  "deja incompletos los datos requeridos para ese método",
  async ({ page }) => {
    await page.locator("#payment-banco").fill("Bancolombia");
    // numeroCuenta y titular quedan vacios a proposito.
  },
);

When("confirma el registro de la forma de pago", async ({ page }) => {
  await page.getByRole("button", { name: /registrar forma de pago/i }).click();
  await waitForCatalogOutcome(page);
});

When(
  "el emprendedor intenta acceder al formulario de registro de producto",
  async ({ page, state }) => {
    await page.goto(`/panel/${state.businessId}/productos`);
  },
);

// ---------- Entonces ----------

Then(
  "el sistema crea el producto asociado a su emprendimiento con estado {string}",
  async ({ state }, statusLabel: string) => {
    const product = await db.product.findFirst({
      where: { businessId: state.businessId, name: PRODUCT_NAME },
    });

    expect(product).not.toBeNull();
    expect(product?.status).toBe(statusLabel === "Publicado" ? "PUBLICADO" : "OCULTO");
    expect(Number(product?.price)).toBe(6000);
    expect(product?.stock).toBe(10);
  },
);

Then("guarda la imagen comprimida y codificada en base64", async ({ state }) => {
  const product = await db.product.findFirst({
    where: { businessId: state.businessId, name: PRODUCT_NAME },
  });

  expect(product?.imageBase64).toMatch(/^data:image\/jpeg;base64,/);
});

Then(
  "el sistema muestra un error indicando que el archivo debe ser una imagen válida",
  async ({ page }) => {
    await expect(page.locator("#product-image-error")).toHaveText(
      "El archivo debe ser una imagen válida (JPG, PNG o WEBP)",
    );
  },
);

Then("el producto no se crea", async ({ state }) => {
  expect(
    await db.product.count({ where: { businessId: state.businessId } }),
  ).toBe(0);
});

Then(
  "el sistema muestra un error indicando que el valor debe ser mayor o igual a cero",
  async ({ page }) => {
    await expect(page.locator("#product-price-error")).toHaveText(
      "El valor debe ser mayor o igual a cero",
    );
    await expect(page.locator("#product-stock-error")).toHaveText(
      "El valor debe ser mayor o igual a cero",
    );
  },
);

Then(
  "el sistema asocia la forma de pago a su emprendimiento",
  async ({ state }) => {
    const method = await db.paymentMethod.findFirst({
      where: { businessId: state.businessId },
    });

    expect(method?.type).toBe("TRANSFERENCIA");
    expect(method?.details).toMatchObject({
      banco: "Bancolombia",
      numeroCuenta: "000-000000-00",
      titular: "Ana Pérez",
    });
  },
);

Then(
  "el sistema muestra un error indicando los datos faltantes",
  async ({ page }) => {
    await expect(page.locator("#payment-numeroCuenta-error")).toHaveText(
      "El número de cuenta es obligatorio",
    );
    await expect(page.locator("#payment-titular-error")).toHaveText(
      "El titular de la cuenta es obligatorio",
    );
  },
);

Then("la forma de pago no se registra", async ({ state }) => {
  expect(
    await db.paymentMethod.count({ where: { businessId: state.businessId } }),
  ).toBe(0);
});

Then("el sistema le impide el acceso", async ({ page }) => {
  // No se renderiza el formulario de producto.
  await expect(page.locator("#product-name")).toHaveCount(0);
});

Then(
  "muestra un mensaje indicando que ese emprendimiento aún no ha sido aprobado",
  async ({ page }) => {
    await expect(page.getByTestId("not-approved-notice")).toContainText(
      /aún no ha sido aprobado/i,
    );
  },
);
