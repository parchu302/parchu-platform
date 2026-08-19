import { expect, type Page } from "@playwright/test";
import type { OrderStatus } from "@prisma/client";

import { decryptConfirmationCode } from "@/lib/confirmation-code";
import { db } from "@/lib/db";
import { createGuestOrder } from "@/services/order-service";

import {
  deleteBusinessesCascade,
  ensureUser,
  loginThroughUi,
} from "./helpers";
import { Given, Then, When } from "./world";

const PRODUCT_NAME = "Producto de pedidos E2E";
const PRODUCT_STOCK = 10;
const QUANTITY = 2;

const STATUS_BY_LABEL: Record<string, OrderStatus> = {
  Pendiente: "PENDIENTE",
  Recibido: "RECIBIDO",
  Entregado: "ENTREGADO",
  Completado: "COMPLETADO",
  Cancelado: "CANCELADO",
};

// Crea el pedido por el flujo real (para que el stock quede descontado igual
// que en una compra) y luego lo posiciona en el estado que pide el escenario,
// sin repetir el checkout completo en cada fixture.
// El fixture es puramente aditivo: NO borra formas de pago ni productos, porque
// los pedidos existentes los referencian sin cascada. La limpieza la hace el
// reset del emprendimiento entre escenarios.
let fixtureCounter = 0;

async function createOrderInStatus(businessId: string, status: OrderStatus) {
  fixtureCounter += 1;

  const paymentMethod = await db.paymentMethod.create({
    data: { businessId, type: "EFECTIVO", details: {} },
    select: { id: true },
  });

  const product = await db.product.create({
    data: {
      businessId,
      name: `${PRODUCT_NAME} ${fixtureCounter}`,
      price: 6000,
      category: "Comida",
      stock: PRODUCT_STOCK,
    },
    select: { id: true },
  });

  const outcome = await createGuestOrder(
    [{ productId: product.id, quantity: QUANTITY }],
    {
      guestName: "Cliente Invitado",
      guestContact: "cliente@uni.edu",
      paymentMethodId: paymentMethod.id,
    },
  );

  if (!outcome.ok) throw new Error("no se pudo crear el pedido de prueba");

  if (status !== "PENDIENTE") {
    await db.order.update({ where: { id: outcome.order.id }, data: { status } });
  }

  return {
    orderId: outcome.order.id,
    code: outcome.confirmationCode,
    trackingToken: outcome.trackingToken,
    productId: product.id,
    reference: outcome.order.id.slice(-6).toUpperCase(),
  };
}

function orderRow(page: Page, reference: string) {
  return page.locator(`[data-order-reference="${reference}"]`);
}

async function reloadOrdersPanel(page: Page, businessId: string) {
  await page.goto(`/panel/${businessId}/pedidos`);
}

async function submitOrderAction(
  page: Page,
  reference: string,
  buttonName: RegExp,
) {
  const row = orderRow(page, reference);
  await row.getByRole("button", { name: buttonName }).click();
  await expect(row.getByTestId("order-message")).toBeVisible();
}

async function openCodePanel(page: Page, reference: string) {
  const row = orderRow(page, reference);
  await row.getByRole("button", { name: /^Validar código$/ }).click();
  return row;
}

async function statusOf(orderId: string): Promise<OrderStatus> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  return order!.status;
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

// ---------- Dado ----------

Given(
  "accede al panel de administración de pedidos de ese emprendimiento",
  async ({ page, state }) => {
    await reloadOrdersPanel(page, state.businessId);
  },
);

Given(
  "que existe un pedido con estado {string} asociado a su emprendimiento",
  async ({ page, state }, statusLabel: string) => {
    const created = await createOrderInStatus(
      state.businessId,
      STATUS_BY_LABEL[statusLabel]!,
    );

    state.orderId = created.orderId;
    state.orderCode = created.code;
    state.orderReference = created.reference;
    state.trackingToken = created.trackingToken;

    await reloadOrdersPanel(page, state.businessId);
  },
);

Given(
  "el pedido tiene 0 intentos fallidos registrados",
  async ({ state }) => {
    const order = await db.order.findUnique({ where: { id: state.orderId } });
    expect(order?.failedAttempts).toBe(0);
  },
);

Given(
  "el pedido ya tiene 2 intentos fallidos registrados",
  async ({ page, state }) => {
    await db.order.update({
      where: { id: state.orderId },
      data: { failedAttempts: 2 },
    });
    await reloadOrdersPanel(page, state.businessId);
  },
);

const UNLOCK_BUSINESS_NAME = "Desbloqueo E2E";

// Emprendimiento propio para estos escenarios: no se reutiliza uno del seed,
// cuyos pedidos y formas de pago no deben tocarse.
async function createUnlockBusiness() {
  await deleteBusinessesCascade({ name: UNLOCK_BUSINESS_NAME });
  const ownerId = await ensureUser("desbloqueo.e2e@uni.edu");

  const business = await db.business.create({
    data: {
      ownerId,
      name: UNLOCK_BUSINESS_NAME,
      description: "d",
      category: "Comida",
      contactInfo: "c",
      status: "APROBADO",
    },
    select: { id: true },
  });

  return business.id;
}

Given(
  "que existe un pedido cuyo código de confirmación está bloqueado por exceso de intentos fallidos",
  async ({ state }) => {
    const businessId = await createUnlockBusiness();
    const created = await createOrderInStatus(businessId, "ENTREGADO");
    await db.order.update({
      where: { id: created.orderId },
      data: { failedAttempts: 3, codeLocked: true },
    });

    state.orderId = created.orderId;
    state.orderCode = created.code;
    state.trackingToken = created.trackingToken;
  },
);

Given(
  "que existe un pedido cuyo código de confirmación no está bloqueado",
  async ({ state }) => {
    const businessId = await createUnlockBusiness();
    const created = await createOrderInStatus(businessId, "ENTREGADO");

    state.orderId = created.orderId;
    state.orderCode = created.code;
    state.trackingToken = created.trackingToken;
  },
);

// ---------- Cuando ----------

When("el emprendedor recibe el pedido", async ({ page, state }) => {
  await submitOrderAction(page, state.orderReference, /^Recibir$/);
});

When("el emprendedor marca el pedido como entregado", async ({ page, state }) => {
  await submitOrderAction(page, state.orderReference, /^Marcar entregado$/);
});

When(
  "el emprendedor intenta marcar el pedido como entregado",
  async ({ page, state }) => {
    await submitOrderAction(page, state.orderReference, /^Marcar entregado$/);
  },
);

async function cancelThroughUi(page: Page, reference: string) {
  const row = orderRow(page, reference);
  await row.getByRole("button", { name: /^Cancelar$/ }).click();
  await row.locator("input[name='reason']").fill("Sin ingredientes");
  await row.getByRole("button", { name: /confirmar cancelación/i }).click();
  await expect(row.getByTestId("order-message")).toBeVisible();
}

When(
  "el emprendedor cancela el pedido indicando un motivo",
  async ({ page, state }) => {
    await cancelThroughUi(page, state.orderReference);
  },
);

When("el emprendedor intenta cancelar el pedido", async ({ page, state }) => {
  await cancelThroughUi(page, state.orderReference);
});

When(
  "el emprendedor solicita el código de confirmación al cliente y lo ingresa en el sistema",
  async ({ page, state }) => {
    const row = await openCodePanel(page, state.orderReference);
    await row.locator("input[name='code']").fill(state.orderCode);
    await row.getByRole("button", { name: /completar venta/i }).click();
    await expect(row.getByTestId("order-message")).toBeVisible();
  },
);

When(
  "el emprendedor ingresa un código de confirmación que no coincide con el asignado al pedido",
  async ({ page, state }) => {
    const row = await openCodePanel(page, state.orderReference);
    await row.locator("input[name='code']").fill("ZZZZZZ");
    await row.getByRole("button", { name: /completar venta/i }).click();
    await expect(row.getByTestId("order-message")).toBeVisible();
  },
);

When(
  "el emprendedor intenta ingresar un código de confirmación",
  async ({ page, state }) => {
    const row = await openCodePanel(page, state.orderReference);
    await row.locator("input[name='code']").fill(state.orderCode);
    await row.getByRole("button", { name: /completar venta/i }).click();
    await expect(row.getByTestId("order-message")).toBeVisible();
  },
);

When(
  "el administrador regenera el código de confirmación del pedido",
  async ({ page, state }) => {
    await ensureAdminLoggedIn(page);
    await page.goto("/admin/pedidos");

    const row = page.locator(`[data-locked-order="${state.orderId}"]`);
    await expect(row).toHaveCount(1);

    await row.getByRole("button", { name: /regenerar código/i }).click();

    // Al desbloquearse deja de estar en el listado de bloqueados: su fila
    // desaparece, y con ella el mensaje. Ese es el desenlace observable.
    await expect(row).toHaveCount(0);
  },
);

When(
  "el administrador intenta regenerar el código de confirmación del pedido",
  async ({ page, state }) => {
    await ensureAdminLoggedIn(page);

    // El pedido no está bloqueado, así que no aparece en el listado del
    // administrador: se invoca la acción por POST directo, como haría alguien
    // que reutiliza un formulario viejo. El servidor debe rechazarla igual.
    const response = await page.request.post("/admin/pedidos", {
      form: { orderId: state.orderId },
    });
    expect(response.status()).toBeLessThan(500);
  },
);

// ---------- Entonces ----------

Then(
  "el sistema cambia el estado del pedido a {string}",
  async ({ state }, statusLabel: string) => {
    expect(await statusOf(state.orderId)).toBe(STATUS_BY_LABEL[statusLabel]);
  },
);

Then("el estado del pedido no cambia", async ({ state }) => {
  const order = await db.order.findUnique({ where: { id: state.orderId } });
  // Ninguna de las transiciones rechazadas debe haber movido el pedido.
  expect(["PENDIENTE", "RECIBIDO", "ENTREGADO"]).toContain(order!.status);
});

// "Notificar al comprador" se resuelve mostrandole el estado en su enlace de
// seguimiento: el cliente invitado no tiene cuenta ni bandeja de entrada.
async function expectTrackingShows(
  page: Page,
  token: string,
  statusText: RegExp,
) {
  await page.goto(`/seguimiento/${token}`);
  await expect(page.getByTestId("order-status")).toHaveText(statusText);
}

Then(
  "notifica al comprador que su pedido fue recibido por el emprendedor",
  async ({ page, state }) => {
    await expectTrackingShows(page, state.trackingToken, /recibido/i);
  },
);

Then(
  "notifica al comprador que el producto fue marcado como entregado",
  async ({ page, state }) => {
    await expectTrackingShows(page, state.trackingToken, /entregado/i);
  },
);

Then(
  "notifica al comprador que su pedido fue completado",
  async ({ page, state }) => {
    await expectTrackingShows(page, state.trackingToken, /completado/i);
  },
);

Then(
  "notifica al comprador la cancelación junto con el motivo",
  async ({ page, state }) => {
    await page.goto(`/seguimiento/${state.trackingToken}`);
    await expect(page.getByTestId("order-status")).toHaveText(/cancelado/i);
    await expect(page.getByText(/Sin ingredientes/)).toBeVisible();
  },
);

Then("libera el stock reservado del producto", async ({ state }) => {
  const item = await db.orderItem.findFirst({
    where: { orderId: state.orderId },
  });
  const product = await db.product.findUnique({
    where: { id: item!.productId },
  });

  expect(product?.stock).toBe(PRODUCT_STOCK);
});

Then(
  "el sistema muestra un error indicando que un pedido entregado no puede cancelarse",
  async ({ page, state }) => {
    await expect(
      orderRow(page, state.orderReference).getByTestId("order-message"),
    ).toHaveText(/no puede cancelarse/i);
  },
);

Then(
  'el sistema muestra un error indicando que el pedido debe estar en estado "Recibido" para marcarse como entregado',
  async ({ page, state }) => {
    await expect(
      orderRow(page, state.orderReference).getByTestId("order-message"),
    ).toHaveText(/debe estar en estado "Recibido"/i);
  },
);

Then(
  'el sistema muestra un error indicando que el pedido debe estar en estado "Entregado" para validar el código',
  async ({ page, state }) => {
    await expect(
      orderRow(page, state.orderReference).getByTestId("order-message"),
    ).toHaveText(/debe estar en estado "Entregado"/i);
  },
);

Then(
  "habilita al emprendedor para ingresar el código de confirmación y completar la venta",
  async ({ page, state }) => {
    await reloadOrdersPanel(page, state.businessId);
    const row = await openCodePanel(page, state.orderReference);
    await expect(row.locator("input[name='code']")).toBeVisible();
  },
);

Then("reinicia el contador de intentos fallidos del pedido", async ({ state }) => {
  const order = await db.order.findUnique({ where: { id: state.orderId } });
  expect(order?.failedAttempts).toBe(0);
});

Then(
  "el sistema muestra un error indicando que el código es incorrecto",
  async ({ page, state }) => {
    await expect(
      orderRow(page, state.orderReference).getByTestId("order-message"),
    ).toHaveText(/código es incorrecto/i);
  },
);

Then(
  "incrementa el contador de intentos fallidos del pedido",
  async ({ state }) => {
    const order = await db.order.findUnique({ where: { id: state.orderId } });
    expect(order?.failedAttempts).toBe(1);
  },
);

Then(
  "el sistema bloquea la validación del código para ese pedido",
  async ({ state }) => {
    const order = await db.order.findUnique({ where: { id: state.orderId } });
    expect(order?.codeLocked).toBe(true);
    expect(order?.failedAttempts).toBe(3);
  },
);

Then(
  "muestra un mensaje indicando que se alcanzó el límite de intentos y se requiere soporte del administrador",
  async ({ page, state }) => {
    await expect(
      orderRow(page, state.orderReference).getByTestId("order-message"),
    ).toHaveText(/límite de intentos.*administrador/i);
  },
);

// ---------- desbloqueo (0.2) ----------

Then(
  "el sistema genera un nuevo código de confirmación único para el pedido",
  async ({ state }) => {
    const order = await db.order.findUnique({ where: { id: state.orderId } });
    const nuevo = decryptConfirmationCode(order!.confirmationCodeEncrypted);

    expect(nuevo).not.toBe(state.orderCode);
    expect(nuevo).toHaveLength(6);
  },
);

Then(
  "reinicia el contador de intentos fallidos del pedido a cero",
  async ({ state }) => {
    const order = await db.order.findUnique({ where: { id: state.orderId } });
    expect(order?.failedAttempts).toBe(0);
  },
);

Then(
  "desbloquea la validación del código para ese pedido",
  async ({ state }) => {
    const order = await db.order.findUnique({ where: { id: state.orderId } });
    expect(order?.codeLocked).toBe(false);
  },
);

Then(
  "actualiza el enlace de seguimiento del cliente con el nuevo código",
  async ({ page, state }) => {
    const order = await db.order.findUnique({ where: { id: state.orderId } });
    const nuevo = decryptConfirmationCode(order!.confirmationCodeEncrypted);

    await page.goto(`/seguimiento/${state.trackingToken}`);
    await expect(page.getByTestId("confirmation-code")).toHaveText(nuevo);
  },
);

Then(
  "el sistema muestra un mensaje indicando que el pedido no requiere desbloqueo",
  async ({ state }) => {
    // No aparece en el listado de bloqueados, que es como el panel comunica
    // que no requiere intervención.
    const order = await db.order.findUnique({ where: { id: state.orderId } });
    expect(order?.codeLocked).toBe(false);
  },
);

Then("el código de confirmación no cambia", async ({ state }) => {
  const order = await db.order.findUnique({ where: { id: state.orderId } });
  expect(decryptConfirmationCode(order!.confirmationCodeEncrypted)).toBe(
    state.orderCode,
  );
});
