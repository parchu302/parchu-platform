import { expect, test } from "@playwright/test";

import { hashPassword } from "@/lib/password";
import { db } from "@/lib/db";

import { tamperJweToken } from "../steps/tamper";

const EMPRENDEDOR_EMAIL = "guard-emprendedor@uni.edu";
const PASSWORD = "ClaveSegura1";

async function loginAs(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await page.waitForURL(/\/(panel|admin)$/);
}

test.beforeAll(async () => {
  await db.user.upsert({
    where: { email: EMPRENDEDOR_EMAIL },
    update: { passwordHash: await hashPassword(PASSWORD), role: "EMPRENDEDOR" },
    create: {
      email: EMPRENDEDOR_EMAIL,
      passwordHash: await hashPassword(PASSWORD),
      firstName: "Guard",
      role: "EMPRENDEDOR",
    },
  });
});

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMPRENDEDOR_EMAIL } });
});

test.describe("protección de rutas (deny by default)", () => {
  for (const path of ["/panel", "/admin"]) {
    test(`redirige a /login al entrar a ${path} sin sesión`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test("un emprendedor no puede entrar al panel de administración", async ({
    page,
  }) => {
    await loginAs(page, EMPRENDEDOR_EMAIL, PASSWORD);

    await page.goto("/admin");

    await expect(page).toHaveURL(/\/panel$/);
    await expect(
      page.getByRole("heading", { name: /panel de administración/i }),
    ).toHaveCount(0);
  });

  test("un administrador no aterriza en el panel del emprendedor", async ({
    page,
  }) => {
    await loginAs(
      page,
      String(process.env.ADMIN_EMAIL),
      String(process.env.ADMIN_PASSWORD),
    );

    await page.goto("/panel");

    await expect(page).toHaveURL(/\/admin$/);
  });

  test("una cookie de sesión manipulada no concede acceso", async ({ page }) => {
    await loginAs(page, EMPRENDEDOR_EMAIL, PASSWORD);

    const cookies = await page.context().cookies();
    const session = cookies.find((c) => c.name === "parchu_session");
    expect(session).toBeTruthy();

    await page.context().clearCookies();
    await page.context().addCookies([
      { ...session!, value: tamperJweToken(session!.value) },
    ]);

    await page.goto("/panel");
    await expect(page).toHaveURL(/\/login$/);
  });

  test("tras cerrar sesión el panel deja de ser accesible", async ({ page }) => {
    await loginAs(page, EMPRENDEDOR_EMAIL, PASSWORD);

    await page.getByRole("button", { name: /cerrar sesión/i }).click();
    await page.waitForURL(/\/login$/);

    await page.goto("/panel");
    await expect(page).toHaveURL(/\/login$/);
  });
});
