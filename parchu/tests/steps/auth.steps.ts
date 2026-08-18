import { expect } from "@playwright/test";

import { hashPassword } from "@/lib/password";
import { db } from "@/lib/db";

import { Given, Then, VALID_PASSWORD, When } from "./world";

const ROLE_BY_LABEL: Record<string, "EMPRENDEDOR" | "ADMIN"> = {
  Emprendedor: "EMPRENDEDOR",
  Administrador: "ADMIN",
};

const REQUIRED_FIELD_ERROR: Record<string, string> = {
  correo: "El correo es obligatorio",
  contraseña: "La contraseña es obligatoria",
  nombre: "El nombre es obligatorio",
};

async function deleteUser(email: string) {
  await db.user.deleteMany({ where: { email: email.toLowerCase() } });
}

async function ensureUser(email: string, password = VALID_PASSWORD) {
  const passwordHash = await hashPassword(password);
  await db.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, role: "EMPRENDEDOR" },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      firstName: "Ana",
      lastName: "Pérez",
      role: "EMPRENDEDOR",
    },
  });
}

async function countUsers(email: string): Promise<number> {
  return db.user.count({ where: { email: email.toLowerCase() } });
}

async function fillRegisterForm(
  page: import("@playwright/test").Page,
  fields: { firstName?: string; lastName?: string; email?: string; password?: string },
) {
  await page.goto("/registro");
  await page.locator("#register-firstName").fill(fields.firstName ?? "Ana");
  await page.locator("#register-lastName").fill(fields.lastName ?? "Pérez");
  await page.locator("#register-email").fill(fields.email ?? "");
  await page.locator("#register-password").fill(fields.password ?? "");
}

const ERROR_SELECTOR = "[data-field-error], [data-testid='auth-error']";

// El click solo despacha el envio: la Server Action es asincrona. Hay que
// esperar a que se resuelva en uno de sus dos desenlaces posibles (navego al
// panel, o aparecio un error) antes de aseverar nada.
async function waitForAuthOutcome(page: import("@playwright/test").Page) {
  await expect
    .poll(
      async () => {
        if (/\/(panel|admin)(\?|$)/.test(page.url())) return "navegado";
        const errors = await page.locator(ERROR_SELECTOR).count();
        return errors > 0 ? "error" : "pendiente";
      },
      { timeout: 15_000 },
    )
    .not.toBe("pendiente");
}

async function submitRegisterForm(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: /crear cuenta/i }).click();
  await waitForAuthOutcome(page);
}

async function loginThroughUi(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await waitForAuthOutcome(page);
}

// ---------- Dado ----------

Given(
  "que no existe una cuenta registrada con el correo {string}",
  async ({ state }, email: string) => {
    await deleteUser(email);
    state.email = email;
    state.accountsBefore = 0;
  },
);

Given(
  "que ya existe una cuenta registrada con el correo {string}",
  async ({ state }, email: string) => {
    await ensureUser(email);
    state.email = email;
    state.accountsBefore = await countUsers(email);
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
    const email = process.env.ADMIN_EMAIL;
    expect(email, "ADMIN_EMAIL debe estar definido en .env").toBeTruthy();

    const admin = await db.user.findUnique({
      where: { email: String(email).toLowerCase() },
    });
    expect(admin?.role, "el admin debe existir sembrado por prisma db seed").toBe(
      "ADMIN",
    );
  },
);

// ---------- Cuando ----------

When(
  "el usuario completa el formulario de registro con correo {string}, contraseña y datos básicos",
  async ({ page, state }, email: string) => {
    state.email = email;
    state.password = VALID_PASSWORD;
    state.accountsBefore = await countUsers(email);
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

    await fillRegisterForm(page, {
      firstName: campo === "nombre" ? "" : "Ana",
      email: campo === "correo" ? "" : email,
      password: campo === "contraseña" ? "" : VALID_PASSWORD,
    });
  },
);

When("confirma el registro", async ({ page }) => {
  await submitRegisterForm(page);
});

When(
  "el usuario intenta registrarse con el correo {string}",
  async ({ page, state }, email: string) => {
    state.email = email;
    state.accountsBefore = await countUsers(email);
    await fillRegisterForm(page, { email, password: VALID_PASSWORD });
    await submitRegisterForm(page);
  },
);

When(
  "el usuario intenta registrarse con una contraseña que no cumple los requisitos mínimos",
  async ({ page, state }) => {
    const email = "insegura@uni.edu";
    await deleteUser(email);
    state.email = email;
    state.accountsBefore = 0;

    await fillRegisterForm(page, { email, password: "abc" });
    await submitRegisterForm(page);
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
    await loginThroughUi(
      page,
      String(process.env.ADMIN_EMAIL),
      String(process.env.ADMIN_PASSWORD),
    );
  },
);

When(
  "el administrador ingresa su correo y una contraseña incorrecta",
  async ({ page }) => {
    await loginThroughUi(
      page,
      String(process.env.ADMIN_EMAIL),
      "ClaveEquivocada9",
    );
  },
);

// ---------- Entonces ----------

Then(
  "el sistema crea la cuenta del emprendedor con rol {string}",
  async ({ state }, rolLabel: string) => {
    const user = await db.user.findUnique({
      where: { email: state.email.toLowerCase() },
    });

    expect(user).not.toBeNull();
    expect(user?.role).toBe(ROLE_BY_LABEL[rolLabel]);
    // La contraseña nunca se guarda en claro.
    expect(user?.passwordHash).not.toContain(state.password);
  },
);

Then(
  "le permite iniciar sesión con esas credenciales",
  async ({ page, state }) => {
    // Se cierra la sesión creada por el registro y se entra de nuevo.
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

Then(
  "el sistema muestra un error indicando que el correo ya está en uso",
  async ({ page }) => {
    await expect(page.locator("#register-email-error")).toHaveText(
      /ya está en uso/i,
    );
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

Then(
  "el sistema muestra un error indicando que el campo {string} es obligatorio",
  async ({ page }, campo: string) => {
    const fieldId =
      campo === "correo"
        ? "#register-email-error"
        : campo === "contraseña"
          ? "#register-password-error"
          : "#register-firstName-error";

    await expect(page.locator(fieldId)).toHaveText(
      REQUIRED_FIELD_ERROR[campo] ?? "",
    );
  },
);

Then("la cuenta no se crea", async ({ page, state }) => {
  // Sigue en el formulario: no hubo redirección al panel.
  await expect(page).toHaveURL(/\/registro$/);

  if (state.email) {
    expect(await countUsers(state.email)).toBe(state.accountsBefore);
  }
});

Then("el sistema autentica al emprendedor", async ({ page }) => {
  const cookies = await page.context().cookies();
  expect(cookies.some((cookie) => cookie.name === "parchu_session")).toBe(true);
});

Then("lo redirige a su panel", async ({ page }) => {
  await page.waitForURL("**/panel");
  await expect(page).toHaveURL(/\/panel$/);
});

Then(
  "el sistema lo autentica con rol {string}",
  async ({ page }, rolLabel: string) => {
    const cookies = await page.context().cookies();
    expect(cookies.some((cookie) => cookie.name === "parchu_session")).toBe(
      true,
    );

    const email = String(process.env.ADMIN_EMAIL).toLowerCase();
    const admin = await db.user.findUnique({ where: { email } });
    expect(admin?.role).toBe(ROLE_BY_LABEL[rolLabel]);
  },
);

Then(
  "lo redirige a un panel con estadísticas básicas de la plataforma",
  async ({ page }) => {
    await page.waitForURL("**/admin");
    await expect(
      page.getByRole("heading", { name: /panel de administración/i }),
    ).toBeVisible();
    await expect(page.getByText("Emprendimientos")).toBeVisible();
    await expect(page.getByText("Pendientes de aprobación")).toBeVisible();
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
  expect(cookies.some((cookie) => cookie.name === "parchu_session")).toBe(false);
});
