import { expect, type Page } from "@playwright/test";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";

import { VALID_PASSWORD } from "./world";

export const ERROR_SELECTOR =
  "[data-field-error], [data-testid='auth-error'], [data-testid='business-error']";

// El click solo despacha el envio: la Server Action es asincrona. Hay que
// esperar a uno de sus dos desenlaces (navego, o aparecio un error) antes de
// aseverar nada.
export async function waitForFormOutcome(page: Page, settledUrl: RegExp) {
  await expect
    .poll(
      async () => {
        if (settledUrl.test(page.url())) return "navegado";
        const errors = await page.locator(ERROR_SELECTOR).count();
        return errors > 0 ? "error" : "pendiente";
      },
      { timeout: 15_000 },
    )
    .not.toBe("pendiente");
}

export const AUTH_SETTLED = /\/(panel|admin)(\?|\/|$)/;
// Excluye /panel/nuevo explicitamente: es el propio formulario, no el
// destino tras un registro exitoso (/panel/{id}?creado=1).
export const BUSINESS_SETTLED = /\/panel\/(?!nuevo)[^/?]+/;

// ---------- datos ----------

export async function deleteUser(email: string) {
  await db.user.deleteMany({ where: { email: email.toLowerCase() } });
}

export async function ensureUser(email: string, password = VALID_PASSWORD) {
  const passwordHash = await hashPassword(password);
  const user = await db.user.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, role: "EMPRENDEDOR" },
    create: {
      email: email.toLowerCase(),
      passwordHash,
      firstName: "Ana",
      lastName: "Pérez",
      role: "EMPRENDEDOR",
    },
    select: { id: true },
  });
  return user.id;
}

export async function countUsers(email: string): Promise<number> {
  return db.user.count({ where: { email: email.toLowerCase() } });
}

// Order.businessId no tiene cascada: hay que borrar pedidos e items antes de
// poder borrar el emprendimiento. Vive aquí para que ningún reset se olvide.
export async function deleteBusinessesCascade(where: object) {
  await db.orderItem.deleteMany({ where: { order: { business: where } } });
  await db.order.deleteMany({ where: { business: where } });
  await db.product.deleteMany({ where: { business: where } });
  await db.paymentMethod.deleteMany({ where: { business: where } });
  await db.business.deleteMany({ where });
}

// ---------- formularios ----------

export async function fillRegisterForm(
  page: Page,
  fields: {
    firstName?: string;
    lastName?: string;
    email?: string;
    password?: string;
  },
) {
  // Todos los intentos de registro locales comparten la misma IP ("local",
  // sin proxy delante): se limpia antes de cada escenario por la misma razon
  // que en loginThroughUi.
  await db.rateLimitAttempt.deleteMany({ where: { key: "register:ip:local" } });

  await page.goto("/registro");
  await page.locator("#register-firstName").fill(fields.firstName ?? "Ana");
  await page.locator("#register-lastName").fill(fields.lastName ?? "Pérez");
  await page.locator("#register-email").fill(fields.email ?? "");
  await page.locator("#register-password").fill(fields.password ?? "");
}

// La suite reutiliza a proposito las mismas cuentas (admin, ana@uni.edu) en
// decenas de escenarios independientes dentro de la misma ventana de rate
// limit, algo que un usuario real nunca haria. Se limpia el contador de esa
// cuenta antes de cada intento para simular "paso el tiempo" entre
// escenarios, sin debilitar el limite real que ve produccion.
export async function loginThroughUi(
  page: Page,
  email: string,
  password: string,
) {
  await db.rateLimitAttempt.deleteMany({
    where: { key: `login:email:${email.toLowerCase()}` },
  });

  await page.goto("/login");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: /iniciar sesión/i }).click();
  await waitForFormOutcome(page, AUTH_SETTLED);
}

export async function fillBusinessForm(
  page: Page,
  fields: {
    name?: string;
    description?: string;
    category?: string;
    contactInfo?: string;
  },
) {
  await page.goto("/panel/nuevo");
  await page.locator("#business-name").fill(fields.name ?? "");
  await page.locator("#business-description").fill(fields.description ?? "");
  await page
    .locator("#business-category")
    .selectOption(fields.category ?? "");
  await page
    .locator("#business-contactInfo")
    .fill(fields.contactInfo ?? "300 000 0000");
}
