import { expect } from "@playwright/test";

import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  AUTH_SETTLED,
  clearMailbox,
  countUsers,
  deleteUser,
  ensureAdmin,
  ensureUser,
  fetchConfirmationPath,
  isSessionCookie,
  must,
  sb,
  fillRegisterForm,
  loginThroughUi,
  waitForFormOutcome,
} from "./helpers";
import { Given, Then, VALID_PASSWORD, When } from "./world";

const ROLE_BY_LABEL: Record<string, "EMPRENDEDOR" | "ADMIN"> = {
  Emprendedor: "EMPRENDEDOR",
  Administrador: "ADMIN",
};

// ---------- Dado ----------

Given(
  "que no existe una cuenta registrada con el correo {string}",
  async ({ state }, email: string) => {
    await deleteUser(email);
    state.email = email;
    state.accountsBefore = 0;
    state.formKind = "auth";
  },
);

Given(
  "que ya existe una cuenta registrada con el correo {string}",
  async ({ state }, email: string) => {
    await ensureUser(email);
    state.email = email;
    state.accountsBefore = await countUsers(email);
    state.formKind = "auth";
  },
);

Given(
  "que existe una cuenta de emprendedor con correo {string} y su contraseña correcta",
  async ({ state }, email: string) => {
    await ensureUser(email);
    state.email = email;
    state.password = VALID_PASSWORD;
  },
);

Given(
  "que existe una cuenta de emprendedor con correo {string}",
  async ({ state }, email: string) => {
    await ensureUser(email);
    state.email = email;
    state.password = VALID_PASSWORD;
  },
);

Given(
  "que la cuenta de administrador fue creada previamente en base de datos",
  async () => {
    // El admin no se siembra por Prisma: se crea confirmado via Admin API.
    await ensureAdmin();

    const admin = must(
      await sb.from("profiles").select("role").eq("email", ADMIN_EMAIL).single(),
    );
    expect(admin.role, "el admin debe existir con rol ADMIN").toBe("ADMIN");
  },
);

// ---------- Cuando ----------

When(
  "el usuario completa el formulario de registro con correo {string}, contraseña y datos básicos",
  async ({ page, state }, email: string) => {
    state.email = email;
    state.password = VALID_PASSWORD;
    state.accountsBefore = await countUsers(email);
    state.formKind = "auth";
    // Evita leer un correo de una corrida anterior al confirmar.
    await clearMailbox();
    await fillRegisterForm(page, { email, password: VALID_PASSWORD });
  },
);

When(
  "el usuario completa el formulario de registro dejando vacío el campo {string}",
  async ({ page, state }, campo: string) => {
    const email = "campos@uni.edu";
    await deleteUser(email);

    state.email = campo === "correo" ? "" : email;
    state.accountsBefore = 0;
    state.formKind = "auth";

    await fillRegisterForm(page, {
      firstName: campo === "nombre" ? "" : "Ana",
      email: campo === "correo" ? "" : email,
      password: campo === "contraseña" ? "" : VALID_PASSWORD,
    });
  },
);

When(
  "el usuario intenta registrarse con el correo {string}",
  async ({ page, state }, email: string) => {
    state.email = email;
    state.accountsBefore = await countUsers(email);
    state.formKind = "auth";
    await clearMailbox();
    await fillRegisterForm(page, { email, password: VALID_PASSWORD });
    await page.getByRole("button", { name: /crear cuenta/i }).click();
    await waitForFormOutcome(page, AUTH_SETTLED);
  },
);

When(
  "el usuario intenta registrarse con una contraseña que no cumple los requisitos mínimos",
  async ({ page, state }) => {
    const email = "insegura@uni.edu";
    await deleteUser(email);
    state.email = email;
    state.accountsBefore = 0;
    state.formKind = "auth";

    await fillRegisterForm(page, { email, password: "abc" });
    await page.getByRole("button", { name: /crear cuenta/i }).click();
    await waitForFormOutcome(page, AUTH_SETTLED);
  },
);

When(
  "el emprendedor ingresa el correo {string} y su contraseña correcta",
  async ({ page }, email: string) => {
    await loginThroughUi(page, email, VALID_PASSWORD);
  },
);

When(
  "el emprendedor ingresa el correo {string} y una contraseña incorrecta",
  async ({ page }, email: string) => {
    await loginThroughUi(page, email, "ClaveEquivocada9");
  },
);

When(
  "el usuario intenta iniciar sesión con el correo {string}",
  async ({ page }, email: string) => {
    await loginThroughUi(page, email, VALID_PASSWORD);
  },
);

When(
  "el administrador ingresa su correo y contraseña correctos",
  async ({ page }) => {
    await ensureAdmin();
    await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  },
);

When(
  "el administrador ingresa su correo y una contraseña incorrecta",
  async ({ page }) => {
    await ensureAdmin();
    await loginThroughUi(page, ADMIN_EMAIL, "ClaveEquivocada9");
  },
);

// ---------- Entonces ----------

Then(
  "el sistema crea la cuenta del emprendedor con rol {string}",
  async ({ state }, rolLabel: string) => {
    // La cuenta existe (Auth + profile creado por trigger) aunque aun no
    // haya confirmado el correo.
    const profile = must(
      await sb
        .from("profiles")
        .select("role, email")
        .eq("email", state.email.toLowerCase())
        .single(),
    );
    expect(profile.role).toBe(ROLE_BY_LABEL[rolLabel]);
  },
);

Then(
  "le indica que debe confirmar su correo para activar la cuenta",
  async ({ page }) => {
    await expect(page.getByTestId("auth-success")).toBeVisible();
    await expect(page.getByTestId("auth-success")).toContainText(
      /confirmación a tu correo/i,
    );
    // Sin confirmar no hay sesion ni redireccion al panel.
    await expect(page).toHaveURL(/\/registro$/);
  },
);

When(
  "el usuario abre el enlace de confirmación recibido por correo",
  async ({ page, state }) => {
    const path = await fetchConfirmationPath(state.email);
    await page.goto(path);
    await page.waitForURL("**/panel");
  },
);

Then(
  "le permite iniciar sesión con esas credenciales",
  async ({ page, state }) => {
    await page.getByRole("button", { name: /cerrar sesión/i }).click();
    await page.waitForURL("**/login");

    await loginThroughUi(page, state.email, state.password);
    await page.waitForURL("**/panel");
  },
);

Then(
  "le indica que puede continuar registrando su emprendimiento",
  async ({ page }) => {
    await expect(
      page.getByText(/continuar registrando tu emprendimiento/i),
    ).toBeVisible();
  },
);

// Supabase Auth aplica proteccion anti-enumeracion: registrar un correo ya
// existente responde igual que un registro nuevo. Ya no hay error "en uso".
Then(
  "el sistema responde con el mismo aviso de revisar el correo sin revelar que la cuenta ya existe",
  async ({ page }) => {
    await expect(page.getByTestId("auth-success")).toBeVisible();
    await expect(page.locator("#register-email-error")).toHaveCount(0);
  },
);

Then(
  "el sistema muestra un error indicando que el formato de correo es inválido",
  async ({ page }) => {
    await expect(page.locator("#register-email-error")).toHaveText(
      /formato del correo es inválido/i,
    );
  },
);

Then(
  "el sistema muestra un error indicando los requisitos de la contraseña",
  async ({ page }) => {
    await expect(page.locator("#register-password-error")).toBeVisible();
  },
);

Then("la cuenta no se crea", async ({ page, state }) => {
  await expect(page).toHaveURL(/\/registro$/);

  if (state.email) {
    expect(await countUsers(state.email)).toBe(state.accountsBefore);
  }
});

Then("el sistema autentica al emprendedor", async ({ page }) => {
  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => isSessionCookie(cookie.name))).toBe(true);
});

Then("lo redirige a su panel", async ({ page }) => {
  await page.waitForURL("**/panel");
  await expect(page).toHaveURL(/\/panel$/);
});

Then(
  "el sistema lo autentica con rol {string}",
  async ({ page }, rolLabel: string) => {
    const cookies = await page.context().cookies();
    expect(cookies.some((cookie) => isSessionCookie(cookie.name))).toBe(true);

    const admin = must(
      await sb.from("profiles").select("role").eq("email", ADMIN_EMAIL).single(),
    );
    expect(admin.role).toBe(ROLE_BY_LABEL[rolLabel]);
  },
);

Then(
  "lo redirige a un panel con estadísticas básicas de la plataforma",
  async ({ page }) => {
    await page.waitForURL("**/admin");
    await expect(
      page.getByRole("heading", { name: /panel de administración/i }),
    ).toBeVisible();
    await expect(page.locator("[data-stat]")).toHaveCount(4);
  },
);

Then(
  "el sistema muestra un error de credenciales inválidas",
  async ({ page }) => {
    await expect(page.getByTestId("auth-error")).toHaveText(
      /credenciales inválidas/i,
    );
  },
);

Then("no concede acceso", async ({ page }) => {
  await expect(page).toHaveURL(/\/login$/);

  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => isSessionCookie(cookie.name))).toBe(false);
});
