import { expect, type Page } from "@playwright/test";

import { createAdminClient } from "@/lib/supabase/admin";

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
        // Registro con verificacion de correo: no navega, muestra aviso.
        if ((await page.getByTestId("auth-success").count()) > 0) return "aviso";
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

// Cliente admin (service-role): salta RLS. Solo para preparar/verificar datos.
export const sb = createAdminClient();

export function must<T>(result: { data: T; error: unknown }): NonNullable<T> {
  if (result.error) throw result.error;
  if (result.data === null || result.data === undefined)
    throw new Error("consulta sin datos");
  return result.data as NonNullable<T>;
}

export function fail(error: unknown): void {
  if (error) throw error;
}

export const ADMIN_EMAIL = (
  process.env.ADMIN_EMAIL || "admin.e2e@uni.edu"
).toLowerCase();
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "AdminSegura1";

export async function clearRateLimit(key: string) {
  fail((await sb.from("RateLimitAttempt").delete().eq("key", key)).error);
}

async function findUserId(email: string): Promise<string | null> {
  const { data, error } = await sb
    .from("profiles")
    .select("id")
    .eq("email", email.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

// Borra pedidos/items/productos/formas de pago/negocios por ids de negocio.
// Order.businessId y Order.paymentMethodId no tienen cascada: los pedidos van
// primero. Vive aqui para que ningun reset se olvide.
export async function deleteBusinessesByIds(ids: string[]) {
  if (ids.length === 0) return;
  const orders = must(await sb.from("Order").select("id").in("businessId", ids));
  const orderIds = orders.map((o) => o.id);
  if (orderIds.length > 0) {
    fail((await sb.from("OrderItem").delete().in("orderId", orderIds)).error);
    fail((await sb.from("Order").delete().in("id", orderIds)).error);
  }
  fail((await sb.from("Product").delete().in("businessId", ids)).error);
  fail((await sb.from("PaymentMethod").delete().in("businessId", ids)).error);
  fail((await sb.from("Business").delete().in("id", ids)).error);
}

// Filtro por nombre: `like` (patron SQL, p. ej. "%E2E%") y/o nombres exactos.
export async function deleteBusinessesCascade(filter: {
  like?: string;
  names?: string[];
}) {
  const ids = new Set<string>();
  if (filter.like) {
    const rows = must(
      await sb.from("Business").select("id").like("name", filter.like),
    );
    rows.forEach((r) => ids.add(r.id));
  }
  if (filter.names?.length) {
    const rows = must(
      await sb.from("Business").select("id").in("name", filter.names),
    );
    rows.forEach((r) => ids.add(r.id));
  }
  await deleteBusinessesByIds([...ids]);
}

// Borra la cuenta de Auth (profiles y Notification caen en cascada); los
// negocios del usuario (ownerId RESTRICT) y sus dependientes van antes.
export async function deleteUser(email: string) {
  const id = await findUserId(email);
  if (!id) return;
  const owned = must(await sb.from("Business").select("id").eq("ownerId", id));
  await deleteBusinessesByIds(owned.map((b) => b.id));
  fail((await sb.auth.admin.deleteUser(id)).error);
}

// Crea (o recrea) un usuario YA confirmado via Admin API. El trigger crea el
// profile EMPRENDEDOR; para ADMIN se promueve despues.
export async function ensureUser(
  email: string,
  password = VALID_PASSWORD,
  opts: { role?: "EMPRENDEDOR" | "ADMIN"; firstName?: string } = {},
) {
  const normalized = email.toLowerCase();
  const existing = await findUserId(normalized);
  if (existing) {
    const { error } = await sb.auth.admin.updateUserById(existing, {
      password,
      email_confirm: true,
    });
    if (error) throw error;
    fail(
      (
        await sb
          .from("profiles")
          .update({ role: opts.role ?? "EMPRENDEDOR" })
          .eq("id", existing)
      ).error,
    );
    return existing;
  }

  const { data, error } = await sb.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
    user_metadata: { firstName: opts.firstName ?? "Ana", lastName: "Pérez" },
  });
  if (error || !data.user) throw error ?? new Error("no se creó el usuario");

  if (opts.role && opts.role !== "EMPRENDEDOR") {
    fail(
      (await sb.from("profiles").update({ role: opts.role }).eq("id", data.user.id))
        .error,
    );
  }
  return data.user.id;
}

export async function ensureAdmin() {
  return ensureUser(ADMIN_EMAIL, ADMIN_PASSWORD, {
    role: "ADMIN",
    firstName: "Admin",
  });
}

export async function countUsers(email: string): Promise<number> {
  const { count, error } = await sb
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("email", email.toLowerCase());
  if (error) throw error;
  return count ?? 0;
}

// ---------- correo (Mailpit) ----------

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailpitMessage = { ID: string; Created: string; To: { Address: string }[] };

// Espera el correo de confirmacion mas reciente para `email` y devuelve el
// token_hash del enlace /auth/confirm. El host del enlace (SiteURL) no es el
// del webServer de prueba, asi que solo se extrae el token.
export async function fetchConfirmationPath(email: string): Promise<string> {
  const target = email.toLowerCase();
  let path = "";

  await expect
    .poll(
      async () => {
        const list = await fetch(`${MAILPIT}/api/v1/messages?limit=50`);
        const body = (await list.json()) as { messages: MailpitMessage[] };
        const mine = body.messages
          .filter((m) => m.To.some((t) => t.Address.toLowerCase() === target))
          .sort((a, b) => (a.Created < b.Created ? 1 : -1))[0];
        if (!mine) return false;

        const detail = await fetch(`${MAILPIT}/api/v1/message/${mine.ID}`);
        const msg = (await detail.json()) as { HTML?: string; Text?: string };
        const text = `${msg.HTML ?? ""}\n${msg.Text ?? ""}`.replace(/&amp;/g, "&");
        const match = /token_hash=([^&"'\s<]+)&type=(\w+)/.exec(text);
        if (!match) return false;
        path = `/auth/confirm?token_hash=${match[1]}&type=${match[2]}`;
        return true;
      },
      { timeout: 20_000, message: `no llegó el correo de confirmación a ${email}` },
    )
    .toBe(true);

  return path;
}

export async function clearMailbox() {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
}

// Nombre de las cookies de sesion de Supabase (sb-<ref>-auth-token[.N]).
export function isSessionCookie(name: string) {
  return /^sb-.+-auth-token(\.\d+)?$/.test(name);
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
  await clearRateLimit("register:ip:local");

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
  await clearRateLimit(`login:email:${email.toLowerCase()}`);

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

export async function ensureAdminLoggedIn(page: Page) {
  await page.goto("/admin");
  if (/\/admin/.test(page.url())) return;

  await ensureAdmin();
  await loginThroughUi(page, ADMIN_EMAIL, ADMIN_PASSWORD);
}
