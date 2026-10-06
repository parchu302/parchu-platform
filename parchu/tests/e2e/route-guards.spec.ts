import { expect, test } from "@playwright/test";

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  clearRateLimit,
  deleteUser,
  ensureAdmin,
  ensureUser,
  fail,
  must,
  sb,
} from "../steps/helpers";
import { tamperSessionCookies } from "../steps/tamper";

const EMPRENDEDOR_EMAIL = "guard-emprendedor@uni.edu";
const PASSWORD = "ClaveSegura1";

async function loginAs(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  // Este archivo reutiliza el mismo email en varios tests seguidos; sin esto
  // el 6to login de la corrida choca con el limite de 5/5min por correo (ver
  // el mismo fix en tests/steps/helpers.ts:loginThroughUi).
  await clearRateLimit(`login:email:${email.toLowerCase()}`);

  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await page.waitForURL(/\/(panel|admin)$/);
}

test.beforeAll(async () => {
  // Usuario ya confirmado via Admin API (el login exige correo verificado).
  await ensureUser(EMPRENDEDOR_EMAIL, PASSWORD, { firstName: "Guard" });
  await ensureAdmin();
});

test.afterAll(async () => {
  await deleteUser(EMPRENDEDOR_EMAIL);
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
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    await page.goto("/panel");

    await expect(page).toHaveURL(/\/admin$/);
  });

  test("una cookie de sesión manipulada no concede acceso", async ({ page }) => {
    await loginAs(page, EMPRENDEDOR_EMAIL, PASSWORD);

    const cookies = await page.context().cookies();
    const tampered = tamperSessionCookies(cookies);
    expect(tampered.length).toBeGreaterThan(0);

    await page.context().clearCookies();
    await page.context().addCookies(tampered);

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

test.describe("desbloqueo de pedidos restringido al administrador", () => {
  test("un emprendedor no puede acceder al panel de pedidos bloqueados", async ({
    page,
  }) => {
    await loginAs(page, EMPRENDEDOR_EMAIL, PASSWORD);

    await page.goto("/admin/pedidos");

    // El proxy lo devuelve a su propio panel.
    await expect(page).toHaveURL(/\/panel$/);
  });

  test("la acción de desbloqueo rechaza a quien no es administrador", async ({
    page,
  }) => {
    await loginAs(page, EMPRENDEDOR_EMAIL, PASSWORD);

    const { data: locked, error } = await sb
      .from("Order")
      .select("id, codeLocked, confirmationCodeHash")
      .eq("codeLocked", true)
      .limit(1)
      .maybeSingle();
    fail(error);
    test.skip(!locked, "no hay pedidos bloqueados sembrados");

    // Invocación directa, saltándose la interfaz: requireRole debe rechazarla
    // igual, porque las Server Actions son alcanzables por POST directo.
    const before = locked!;

    await page.request.post("/admin/pedidos", {
      form: { orderId: locked!.id },
    });

    const after = must(
      await sb
        .from("Order")
        .select("codeLocked, confirmationCodeHash")
        .eq("id", locked!.id)
        .single(),
    );
    expect(after.codeLocked).toBe(true);
    expect(after.confirmationCodeHash).toBe(before.confirmationCodeHash);
  });
});
