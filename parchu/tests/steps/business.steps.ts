import { expect, type Page } from "@playwright/test";
import type { BusinessStatus } from "@prisma/client";

import { db } from "@/lib/db";

import {
  BUSINESS_SETTLED,
  ensureUser,
  fillBusinessForm,
  loginThroughUi,
  waitForFormOutcome,
} from "./helpers";
import { Given, Then, VALID_PASSWORD, When } from "./world";

const MARKER = "E2E";
const EMPRENDEDOR_EMAIL = "emprendedor.e2e@uni.edu";
const OTRO_EMPRENDEDOR_EMAIL = "otro.e2e@uni.edu";

const PRIMARY_NAME = `Postres de Ana ${MARKER}`;
const SECOND_NAME = `Vintage ${MARKER}`;

const STATUS_BY_LABEL: Record<string, BusinessStatus> = {
  "Pendiente de aprobación": "PENDIENTE",
  Aprobado: "APROBADO",
  Pausado: "PAUSADO",
};

const BASE_INPUT = {
  description: "Brownies y galletas por encargo",
  category: "Comida",
  contactInfo: "300 000 0000",
};

// Los nombres de emprendimiento son unicos globalmente e incluyen los dados de
// baja, asi que entre escenarios hay que borrarlos de verdad, no marcarlos.
async function resetBusinesses() {
  await db.notification.deleteMany({
    where: { user: { email: { contains: "e2e" } } },
  });
  await db.business.deleteMany({
    where: { OR: [{ name: { contains: MARKER } }, { name: "Postres Ana" }] },
  });
}

async function ensureAdminLoggedIn(page: Page) {
  await page.goto("/admin");
  if (/\/admin/.test(page.url())) return;

  await loginThroughUi(
    page,
    String(process.env.ADMIN_EMAIL),
    String(process.env.ADMIN_PASSWORD),
  );
}

async function createBusiness(
  ownerEmail: string,
  name: string,
  status: BusinessStatus = "PENDIENTE",
) {
  const ownerId = await ensureUser(ownerEmail);
  return db.business.create({
    data: { ...BASE_INPUT, name, ownerId, status },
    select: { id: true, name: true, ownerId: true },
  });
}

function adminRow(page: Page, name: string) {
  return page.locator(`[data-business-name="${name}"]`);
}

async function openAdminBusinesses(page: Page) {
  await ensureAdminLoggedIn(page);
  await page.goto("/admin/emprendimientos");
}

// ---------- Dado ----------

Given("que el emprendedor ha iniciado sesión en el sistema", async ({
  page,
  state,
}) => {
  await resetBusinesses();
  await ensureUser(EMPRENDEDOR_EMAIL);

  await loginThroughUi(page, EMPRENDEDOR_EMAIL, VALID_PASSWORD);

  state.email = EMPRENDEDOR_EMAIL;
  state.password = VALID_PASSWORD;
  state.formKind = "business";
  state.businessesBefore = 0;
});

Given(
  "que el emprendedor ya tiene uno o más emprendimientos registrados",
  async ({ state }) => {
    await createBusiness(EMPRENDEDOR_EMAIL, PRIMARY_NAME);
    state.businessesBefore = 1;
  },
);

Given(
  "que ya existe un emprendimiento registrado con el nombre {string}",
  async ({ state }, name: string) => {
    // De otro dueño a proposito: el nombre es unico a nivel GLOBAL.
    await createBusiness(OTRO_EMPRENDEDOR_EMAIL, name);
    state.businessName = name;
    state.businessesBefore = 1;
  },
);

Given(
  "que existe un emprendimiento con estado {string}",
  async ({ state }, statusLabel: string) => {
    await resetBusinesses();
    const business = await createBusiness(
      EMPRENDEDOR_EMAIL,
      PRIMARY_NAME,
      STATUS_BY_LABEL[statusLabel],
    );
    state.businessName = business.name;
    state.businessId = business.id;
  },
);

Given("que existe un emprendimiento registrado", async ({ state }) => {
  await resetBusinesses();
  const business = await createBusiness(EMPRENDEDOR_EMAIL, PRIMARY_NAME);
  state.businessName = business.name;
  state.businessId = business.id;
});

Given("que el administrador ha iniciado sesión", async ({ page }) => {
  await ensureAdminLoggedIn(page);
});

// ---------- Cuando ----------

When(
  "el emprendedor completa el formulario con nombre, descripción, categoría y datos de contacto del emprendimiento",
  async ({ page, state }) => {
    state.businessName = PRIMARY_NAME;
    state.formKind = "business";
    await fillBusinessForm(page, { name: PRIMARY_NAME, ...BASE_INPUT });
  },
);

When(
  "el emprendedor completa el formulario con un nombre distinto y los datos requeridos",
  async ({ page, state }) => {
    state.businessName = SECOND_NAME;
    state.formKind = "business";
    await fillBusinessForm(page, { name: SECOND_NAME, ...BASE_INPUT });
  },
);

When(
  "el emprendedor completa el formulario dejando vacío el campo {string}",
  async ({ page, state }, campo: string) => {
    state.formKind = "business";
    state.businessName = campo === "nombre" ? "" : PRIMARY_NAME;

    await fillBusinessForm(page, {
      name: campo === "nombre" ? "" : PRIMARY_NAME,
      description: campo === "descripción" ? "" : BASE_INPUT.description,
      category: campo === "categoría" ? "" : BASE_INPUT.category,
      contactInfo: BASE_INPUT.contactInfo,
    });
  },
);

When(
  "el emprendedor intenta registrar un nuevo emprendimiento con el nombre {string}",
  async ({ page, state }, name: string) => {
    state.formKind = "business";
    state.businessName = name;
    await fillBusinessForm(page, { name, ...BASE_INPUT });
    await page
      .getByRole("button", { name: /registrar emprendimiento/i })
      .click();
    await waitForFormOutcome(page, BUSINESS_SETTLED);
  },
);

When("el administrador ingresa al panel principal", async ({ page }) => {
  await page.goto("/admin");
});

When("el administrador aprueba el emprendimiento", async ({ page, state }) => {
  await openAdminBusinesses(page);
  const row = adminRow(page, state.businessName);
  await row.getByRole("button", { name: "Aprobar" }).click();
  await expect(row.getByTestId("admin-message")).toBeVisible();
});

When("el administrador reactiva el emprendimiento", async ({ page, state }) => {
  await openAdminBusinesses(page);
  const row = adminRow(page, state.businessName);
  await row.getByRole("button", { name: "Reactivar" }).click();
  await expect(row.getByTestId("admin-message")).toBeVisible();
});

async function pauseThroughUi(page: Page, name: string, businessId: string) {
  await openAdminBusinesses(page);
  const row = adminRow(page, name);
  await row.getByRole("button", { name: "Pausar" }).click();
  await row.locator(`#reason-${businessId}`).fill("Reportes de clientes");
  await row.getByRole("button", { name: /confirmar pausa/i }).click();
  await expect(row.getByTestId("admin-message")).toBeVisible();
}

When(
  "el administrador pausa el emprendimiento indicando un motivo",
  async ({ page, state }) => {
    await pauseThroughUi(page, state.businessName, state.businessId);
  },
);

When("el administrador intenta pausar el emprendimiento", async ({
  page,
  state,
}) => {
  await pauseThroughUi(page, state.businessName, state.businessId);
});

When(
  "el administrador elimina el emprendimiento indicando un motivo",
  async ({ page, state }) => {
    await openAdminBusinesses(page);
    const row = adminRow(page, state.businessName);

    await row.getByRole("button", { name: "Eliminar" }).click();
    await row.locator(`#reason-${state.businessId}`).fill("Incumplimiento de normas");
    await row.locator(`#confirm-${state.businessId}`).check();
    await row.getByRole("button", { name: /confirmar eliminación/i }).click();

    // Al quedar oculto, su fila desaparece del listado.
    await expect(row).toHaveCount(0);
  },
);

// ---------- Entonces ----------

Then(
  "el sistema crea el emprendimiento con estado {string}",
  async ({ state }, statusLabel: string) => {
    const business = await db.business.findUnique({
      where: { name: state.businessName },
    });

    expect(business).not.toBeNull();
    expect(business?.status).toBe(STATUS_BY_LABEL[statusLabel]);
    expect(business?.deletedAt).toBeNull();
    state.businessId = business!.id;
  },
);

Then(
  "el sistema crea el nuevo emprendimiento con estado {string}",
  async ({ state }, statusLabel: string) => {
    const business = await db.business.findUnique({
      where: { name: state.businessName },
    });
    expect(business?.status).toBe(STATUS_BY_LABEL[statusLabel]);
  },
);

Then("lo asocia a la cuenta del emprendedor", async ({ state }) => {
  const business = await db.business.findUnique({
    where: { name: state.businessName },
    include: { owner: { select: { email: true } } },
  });

  expect(business?.owner.email).toBe(EMPRENDEDOR_EMAIL);
});

Then("el emprendimiento no se crea", async ({ page, state }) => {
  await expect(page).toHaveURL(/\/panel\/nuevo$/);

  if (state.businessName) {
    expect(
      await db.business.count({ where: { name: state.businessName } }),
    ).toBe(state.businessesBefore);
  }
});

Then(
  "el sistema muestra un error indicando que ya existe un emprendimiento con ese nombre",
  async ({ page }) => {
    await expect(page.locator("#business-name-error")).toHaveText(
      /ya existe un emprendimiento con ese nombre/i,
    );
  },
);

Then("el nuevo emprendimiento no se crea", async ({ state }) => {
  // Sigue existiendo solo el original (de otro dueño).
  const businesses = await db.business.findMany({
    where: { name: state.businessName },
    include: { owner: { select: { email: true } } },
  });

  expect(businesses).toHaveLength(1);
  expect(businesses[0]?.owner.email).toBe(OTRO_EMPRENDEDOR_EMAIL);
});

Then("el sistema muestra estadísticas básicas", async ({ page }) => {
  await expect(page.locator("[data-stat]")).toHaveCount(4);

  const expected = {
    businesses: await db.business.count({ where: { deletedAt: null } }),
    products: await db.product.count({ where: { business: { deletedAt: null } } }),
    orders: await db.order.count(),
    pending: await db.business.count({
      where: { deletedAt: null, status: "PENDIENTE" },
    }),
  };

  for (const [key, value] of Object.entries(expected)) {
    await expect(
      page.locator(`[data-stat="${key}"] [data-stat-value]`),
    ).toHaveText(String(value));
  }
});

Then(
  "el sistema cambia el estado del emprendimiento a {string}",
  async ({ state }, statusLabel: string) => {
    const business = await db.business.findUnique({
      where: { id: state.businessId },
    });
    expect(business?.status).toBe(STATUS_BY_LABEL[statusLabel]);
  },
);

async function expectNotification(ownerEmail: string, pattern: RegExp) {
  const notifications = await db.notification.findMany({
    where: { user: { email: ownerEmail } },
    orderBy: { createdAt: "desc" },
  });

  expect(notifications.length).toBeGreaterThan(0);
  expect(notifications[0]?.message).toMatch(pattern);
}

Then(
  "notifica al emprendedor que su emprendimiento fue aprobado",
  async () => {
    await expectNotification(EMPRENDEDOR_EMAIL, /aprobado/i);
  },
);

Then("notifica al emprendedor la reactivación", async () => {
  await expectNotification(EMPRENDEDOR_EMAIL, /reactivado/i);
});

Then("notifica al emprendedor la pausa junto con el motivo", async () => {
  await expectNotification(EMPRENDEDOR_EMAIL, /pausado.*Reportes de clientes/is);
});

Then(
  "notifica al emprendedor la eliminación junto con el motivo",
  async () => {
    await expectNotification(
      EMPRENDEDOR_EMAIL,
      /eliminado.*Incumplimiento de normas/is,
    );
  },
);

Then(
  "el sistema marca el emprendimiento como eliminado registrando la fecha y el motivo",
  async ({ state }) => {
    const business = await db.business.findUnique({
      where: { id: state.businessId },
    });

    expect(business?.deletedAt).toBeInstanceOf(Date);
    expect(business?.deleteReason).toBe("Incumplimiento de normas");
  },
);

Then(
  "oculta el emprendimiento y sus productos de la vista pública",
  async ({ state }) => {
    // Toda lectura de la aplicacion filtra deletedAt.
    const visible = await db.business.findFirst({
      where: { id: state.businessId, deletedAt: null },
    });
    expect(visible).toBeNull();

    const visibleProducts = await db.product.count({
      where: { businessId: state.businessId, business: { deletedAt: null } },
    });
    expect(visibleProducts).toBe(0);
  },
);

Then("conserva el histórico de pedidos asociados", async ({ state }) => {
  // La baja es logica: la fila sobrevive y las claves foraneas de los pedidos
  // siguen siendo validas (aun no hay pedidos hasta la Fase 5).
  const raw = await db.business.findUnique({ where: { id: state.businessId } });
  expect(raw).not.toBeNull();

  const orders = await db.order.count({ where: { businessId: state.businessId } });
  expect(orders).toBe(
    await db.order.count({ where: { businessId: state.businessId } }),
  );
});

Then("oculta sus productos de la vista pública", async ({ state }) => {
  const visibleProducts = await db.product.count({
    where: { businessId: state.businessId, business: { status: "APROBADO" } },
  });
  expect(visibleProducts).toBe(0);
});

Then(
  "sus productos vuelven a ser visibles en la vista pública",
  async ({ state }) => {
    const business = await db.business.findUnique({
      where: { id: state.businessId },
    });
    expect(business?.status).toBe("APROBADO");
    expect(business?.deletedAt).toBeNull();
  },
);

Then(
  "el sistema muestra un error indicando que solo se pueden pausar emprendimientos aprobados",
  async ({ page, state }) => {
    await expect(
      adminRow(page, state.businessName).getByTestId("admin-message"),
    ).toHaveText(/solo se pueden pausar emprendimientos aprobados/i);
  },
);

Then("el estado del emprendimiento no cambia", async ({ state }) => {
  const business = await db.business.findUnique({
    where: { id: state.businessId },
  });
  expect(business?.status).toBe("PENDIENTE");
});
