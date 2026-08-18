import { expect, test } from "@playwright/test";

import { db } from "@/lib/db";

// Regresion: el formulario del landing quedo roto en la Fase 0 por exportar
// una constante desde un archivo "use server". Los unit tests no lo detectaron
// porque importan el modulo directamente, sin pasar por la validacion de Next.
// Solo un envio real por el navegador cubre ese fallo.
const SELLS = "regresion-e2e-landing";

test.afterEach(async () => {
  await db.sellerLead.deleteMany({ where: { sells: SELLS } });
});

test("el formulario del landing persiste el lead", async ({ page }) => {
  await page.goto("/");

  await page.locator("#lead-name").fill("Ana Pérez");
  await page.locator("#lead-whatsapp").fill("300 000 0000");
  await page.locator("#lead-sells").fill(SELLS);
  await page.getByRole("button", { name: /enviar y unirme/i }).click();

  await expect(page.getByText(/te contactamos esta misma semana/i)).toBeVisible();

  const leads = await db.sellerLead.findMany({ where: { sells: SELLS } });
  expect(leads).toHaveLength(1);
  expect(leads[0]?.name).toBe("Ana Pérez");
});

test("el formulario del landing rechaza campos vacíos sin crear filas", async ({
  page,
}) => {
  const before = await db.sellerLead.count();

  await page.goto("/");
  await page.locator("#lead-sells").fill(SELLS);
  await page.getByRole("button", { name: /enviar y unirme/i }).click();

  await expect(page.locator("#lead-name-error")).toHaveText(
    /el nombre es obligatorio/i,
  );
  expect(await db.sellerLead.count()).toBe(before);
});
