import { expect, type Page } from "@playwright/test";

import { decryptConfirmationCode } from "@/lib/confirmation-code";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

import { Given, Then, When } from "./world";

const MARKER = "CHECKOUT-E2E";
const OWNER_EMAIL = "checkout.e2e@uni.edu";
const BUSINESS_NAME = `Cocina ${MARKER}`;
const PRODUCT_NAME = `Combo ${MARKER}`;

const GUEST = {
  name: "Cliente Invitado",
  contact: "cliente@uni.edu",
};

async function resetCheckoutData() {
  await db.orderItem.deleteMany({
    where: { order: { business: { name: BUSINESS_NAME } } },
  });
  await db.order.deleteMany({ where: { business: { name: BUSINESS_NAME } } });
  await db.product.deleteMany({ where: { business: { name: BUSINESS_NAME } } });
  await db.paymentMethod.deleteMany({
    where: { business: { name: BUSINESS_NAME } },
  });
  await db.business.deleteMany({ where: { name: BUSINESS_NAME } });
}

async function createShop(stock: number) {
  await resetCheckoutData();

  const owner = await db.user.upsert({
    where: { email: OWNER_EMAIL },
    update: {},
    create: {
      email: OWNER_EMAIL,
      passwordHash: await hashPassword("ClaveSegura1"),
      firstName: "Cocina",
      role: "EMPRENDEDOR",
    },
    select: { id: true },
  });

  const business = await db.business.create({
    data: {
      ownerId: owner.id,
      name: BUSINESS_NAME,
      description: "Comida del campus",
      category: "Comida",
      contactInfo: "300 000 0000",
      status: "APROBADO",
    },
    select: { id: true },
  });

  await db.paymentMethod.create({
    data: { businessId: business.id, type: "EFECTIVO", details: {} },
  });

  const product = await db.product.create({
    data: {
      businessId: business.id,
      name: PRODUCT_NAME,
      description: "Combo de prueba",
      price: 12000,
      category: "Comida",
      stock,
    },
    select: { id: true },
  });

  return { businessId: business.id, productId: product.id };
}

// El carrito es una cookie httpOnly que solo escriben las Server Actions: se
// llena usando la interfaz, como haria un cliente real.
async function addProductToCart(page: Page) {
  await page.context().clearCookies();
  await page.goto(`/productos?q=${encodeURIComponent(PRODUCT_NAME)}`);

  const card = page.locator(`[data-product-name="${PRODUCT_NAME}"]`);
  await expect(card).toHaveCount(1);
  await card.getByRole("button", { name: "Agregar" }).click();
  await expect(card.getByTestId("cart-message")).toContainText(/agregado/i);

  await page.goto("/checkout");
  await expect(page.getByTestId("checkout-total")).toBeVisible();
}

async function fillGuestData(
  page: Page,
  overrides: Partial<typeof GUEST> = {},
) {
  const values = { ...GUEST, ...overrides };
  await page.locator("#checkout-name").fill(values.name);
  await page.locator("#checkout-contact").fill(values.contact);
}

async function selectFirstPaymentMethod(page: Page) {
  const select = page.locator("#checkout-payment");
  const value = await select.locator("option").nth(1).getAttribute("value");
  await select.selectOption(value ?? "");
}

async function ordersForShop() {
  return db.order.count({ where: { business: { name: BUSINESS_NAME } } });
}

// ---------- Dado ----------

Given(
  "que el cliente tiene productos seleccionados para comprar",
  async ({ page, state }) => {
    await createShop(10);
    state.formKind = "checkout";
    await addProductToCart(page);
  },
);

Given(
  "que el cliente tiene un producto seleccionado cuyo stock disponible es menor a la cantidad solicitada",
  async ({ page, state }) => {
    const shop = await createShop(1);
    state.formKind = "checkout";

    await addProductToCart(page);

    // Otra persona se lleva la última unidad después de que este cliente la
    // puso en su carrito: el servidor debe detectarlo al confirmar.
    await db.product.update({
      where: { id: shop.productId },
      data: { stock: 0 },
    });

    await fillGuestData(page);
    await selectFirstPaymentMethod(page);
  },
);

// ---------- Cuando ----------

When("el cliente completa sus datos básicos", async ({ page }) => {
  await fillGuestData(page);
});

When(
  "el cliente completa sus datos básicos dejando vacío el campo {string}",
  async ({ page }, campo: string) => {
    await fillGuestData(page, {
      name: campo === "nombre" ? "" : GUEST.name,
      contact: campo === "contacto" ? "" : GUEST.contact,
    });
    await selectFirstPaymentMethod(page);
  },
);

When(
  "el cliente ingresa un correo o teléfono con formato inválido como dato de contacto",
  async ({ page }) => {
    await fillGuestData(page, { contact: "no-es-contacto" });
    await selectFirstPaymentMethod(page);
  },
);

When("selecciona una forma de pago disponible", async ({ page }) => {
  await selectFirstPaymentMethod(page);
});

// El caso de uso enuncia este paso de dos formas; ambas hacen lo mismo.
async function confirmPurchase(page: Page) {
  await page.getByRole("button", { name: /confirmar compra/i }).click();

  await expect
    .poll(
      async () => {
        if (/\/seguimiento\//.test(page.url())) return "confirmado";
        const errors = await page
          .locator("[data-field-error], [data-testid='checkout-error']")
          .count();
        return errors > 0 ? "error" : "pendiente";
      },
      { timeout: 15_000 },
    )
    .not.toBe("pendiente");
}

When("confirma la compra", async ({ page }) => {
  await confirmPurchase(page);
});

When("el cliente confirma la compra", async ({ page }) => {
  await confirmPurchase(page);
});

// ---------- Entonces ----------

Then(
  "el sistema crea el pedido con estado {string}",
  async ({ state }, statusLabel: string) => {
    const order = await db.order.findFirst({
      where: { business: { name: BUSINESS_NAME } },
      orderBy: { createdAt: "desc" },
    });

    expect(order).not.toBeNull();
    expect(order?.status).toBe(statusLabel.toUpperCase());
    expect(order?.guestName).toBe(GUEST.name);
    expect(order?.guestContact).toBe(GUEST.contact);

    state.businessId = order!.id;
  },
);

Then(
  "genera un código de confirmación único asociado al pedido",
  async ({ page }) => {
    const order = await db.order.findFirst({
      where: { business: { name: BUSINESS_NAME } },
      orderBy: { createdAt: "desc" },
    });

    expect(order?.confirmationCodeHash).toBeTruthy();
    expect(order?.confirmationCodeEncrypted).toBeTruthy();

    const shown = await page.getByTestId("confirmation-code").textContent();
    expect(shown?.trim()).toHaveLength(6);

    // El código mostrado es el que guarda el pedido, pero no está en claro
    // en ninguna de las dos columnas.
    expect(decryptConfirmationCode(order!.confirmationCodeEncrypted)).toBe(
      shown?.trim(),
    );
    expect(order!.confirmationCodeHash).not.toContain(shown?.trim() ?? "");
    expect(order!.confirmationCodeEncrypted).not.toContain(shown?.trim() ?? "");
  },
);

Then(
  "genera un enlace de seguimiento único para que el cliente consulte el estado y el código del pedido",
  async ({ page }) => {
    const order = await db.order.findFirst({
      where: { business: { name: BUSINESS_NAME } },
      orderBy: { createdAt: "desc" },
    });

    expect(page.url()).toContain(`/seguimiento/${order!.trackingToken}`);
    // No adivinable: 32 bytes de entropía.
    expect(Buffer.from(order!.trackingToken, "base64url").length).toBe(32);
  },
);

Then(
  "muestra al cliente una confirmación con el detalle del pedido, su código de confirmación y su enlace de seguimiento",
  async ({ page }) => {
    await expect(page.getByTestId("order-confirmed")).toBeVisible();
    await expect(page.getByTestId("order-status")).toHaveText("Pendiente");
    await expect(
      page.locator(`[data-order-item="${PRODUCT_NAME}"]`),
    ).toBeVisible();
    await expect(page.getByTestId("order-total")).toBeVisible();
    await expect(page.getByTestId("confirmation-code")).toBeVisible();
    await expect(page.getByTestId("tracking-link")).toContainText(
      "/seguimiento/",
    );
  },
);

Then(
  "el sistema muestra un error indicando que el formato de contacto es inválido",
  async ({ page }) => {
    await expect(page.locator("#checkout-contact-error")).toHaveText(
      /correo o un teléfono válido/i,
    );
  },
);

Then(
  "el sistema muestra un error indicando que no hay stock suficiente",
  async ({ page }) => {
    await expect(page.getByTestId("checkout-error")).toContainText(
      /no hay stock suficiente/i,
    );
  },
);

Then("el pedido no se crea", async () => {
  expect(await ordersForShop()).toBe(0);
});
