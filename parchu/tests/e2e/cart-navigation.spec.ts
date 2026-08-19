import { expect, test } from "@playwright/test";

// Regresión: el botón "Agregar" no tenía ningún enlace visible hacia el
// carrito/checkout. Un usuario real no tenía forma de encontrar cómo comprar
// tras agregar un producto (detectado navegando la app, no por un escenario
// Gherkin: el caso de uso 0.3 empieza asumiendo que el cliente ya llegó al
// checkout, sin cubrir cómo llega).
const PRODUCT_NAME = "Brownie";

test("tras agregar un producto, aparece un enlace visible al carrito", async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto(`/productos?q=${encodeURIComponent(PRODUCT_NAME)}`);

  await expect(page.getByTestId("cart-summary-link")).toHaveCount(0);

  const card = page.locator(`[data-product-name="${PRODUCT_NAME}"]`);
  await card.getByRole("button", { name: "Agregar" }).click();
  await expect(card.getByTestId("cart-message")).toContainText(/agregado/i);

  const cartLink = page.getByTestId("cart-summary-link");
  await expect(cartLink).toBeVisible();
  await expect(page.getByTestId("cart-summary-count")).toHaveText("1");

  await cartLink.click();
  await expect(page).toHaveURL(/\/checkout$/);
  await expect(page.locator(`[data-cart-item="${PRODUCT_NAME}"]`)).toBeVisible();
});

test("el contador del carrito aumenta al agregar el mismo producto otra vez", async ({
  page,
}) => {
  await page.context().clearCookies();
  await page.goto(`/productos?q=${encodeURIComponent(PRODUCT_NAME)}`);

  const card = page.locator(`[data-product-name="${PRODUCT_NAME}"]`);
  await card.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByTestId("cart-summary-count")).toHaveText("1");

  await card.getByRole("button", { name: "Agregar" }).click();
  await expect(page.getByTestId("cart-summary-count")).toHaveText("2");
});
