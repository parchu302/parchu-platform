import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import {
  findBusinessById,
  listBusinessesByOwner,
} from "@/repositories/business-repository";
import {
  approveBusiness,
  deleteBusiness,
  pauseBusiness,
  reactivateBusiness,
  registerBusiness,
} from "@/services/business-service";
import type { NotificationService } from "@/services/notification-service";

const MARKER = "fase2";
const OWNER_EMAIL = `dueno.${MARKER}@uni.edu`;

const INPUT = {
  name: `Postres Ana ${MARKER}`,
  description: "Brownies y galletas por encargo",
  category: "Comida",
  contactInfo: "300 000 0000",
};

// Doble de prueba: captura los avisos sin escribir en la tabla.
function fakeNotifications() {
  const sent: { userId: string; message: string }[] = [];
  const service: NotificationService = {
    async notify(userId, message) {
      sent.push({ userId, message });
    },
  };
  return { sent, service };
}

let ownerId: string;

async function cleanup() {
  await db.notification.deleteMany({
    where: { user: { email: { contains: MARKER } } },
  });
  await db.business.deleteMany({ where: { name: { contains: MARKER } } });
  await db.user.deleteMany({ where: { email: { contains: MARKER } } });
}

beforeEach(async () => {
  await cleanup();
  const owner = await db.user.create({
    data: {
      email: OWNER_EMAIL,
      passwordHash: await hashPassword("ClaveSegura1"),
      firstName: "Ana",
      role: "EMPRENDEDOR",
    },
    select: { id: true },
  });
  ownerId = owner.id;
});

afterEach(cleanup);

async function createWithStatus(
  status: "PENDIENTE" | "APROBADO" | "PAUSADO",
  name = INPUT.name,
) {
  const outcome = await registerBusiness(ownerId, { ...INPUT, name });
  if (!outcome.ok) throw new Error("no se pudo crear el emprendimiento");
  if (status !== "PENDIENTE") {
    await db.business.update({
      where: { id: outcome.business.id },
      data: { status },
    });
  }
  return outcome.business.id;
}

describe("registerBusiness (Gherkin 1)", () => {
  it("crea el emprendimiento en PENDIENTE y lo asocia al emprendedor", async () => {
    const outcome = await registerBusiness(ownerId, INPUT);

    expect(outcome.ok).toBe(true);
    if (!outcome.ok) return;
    expect(outcome.business.status).toBe("PENDIENTE");
    expect(outcome.business.ownerId).toBe(ownerId);
    expect(outcome.business.deletedAt).toBeNull();
  });

  it("permite varios emprendimientos por emprendedor (1:N)", async () => {
    await registerBusiness(ownerId, INPUT);
    const second = await registerBusiness(ownerId, {
      ...INPUT,
      name: `Vintage ${MARKER}`,
    });

    expect(second.ok).toBe(true);
    expect(await listBusinessesByOwner(ownerId)).toHaveLength(2);
  });

  it("rechaza un nombre ya existente y no crea el segundo", async () => {
    await registerBusiness(ownerId, INPUT);

    const duplicate = await registerBusiness(ownerId, INPUT);

    expect(duplicate).toEqual({ ok: false, reason: "NAME_TAKEN" });
    expect(await db.business.count({ where: { name: INPUT.name } })).toBe(1);
  });

  it("mantiene reservado el nombre de un emprendimiento dado de baja", async () => {
    const id = await createWithStatus("PENDIENTE");
    await deleteBusiness(id, "Incumplimiento", fakeNotifications().service);

    // El indice unico de name es global: incluye los eliminados.
    expect(await registerBusiness(ownerId, INPUT)).toEqual({
      ok: false,
      reason: "NAME_TAKEN",
    });
  });
});

describe("transiciones de estado (Gherkin 0.2 y §6)", () => {
  it("aprueba un emprendimiento pendiente y notifica al emprendedor", async () => {
    const id = await createWithStatus("PENDIENTE");
    const { sent, service } = fakeNotifications();

    const outcome = await approveBusiness(id, service);

    expect(outcome.ok).toBe(true);
    expect((await findBusinessById(id))?.status).toBe("APROBADO");
    expect(sent).toHaveLength(1);
    expect(sent[0]?.userId).toBe(ownerId);
    expect(sent[0]?.message).toMatch(/aprobado/i);
  });

  it("pausa un emprendimiento aprobado e incluye el motivo en el aviso", async () => {
    const id = await createWithStatus("APROBADO");
    const { sent, service } = fakeNotifications();

    const outcome = await pauseBusiness(id, "Reportes de clientes", service);

    expect(outcome.ok).toBe(true);
    expect((await findBusinessById(id))?.status).toBe("PAUSADO");
    expect(sent[0]?.message).toContain("Reportes de clientes");
  });

  // Escenario: Intento de pausar un emprendimiento no aprobado
  it("rechaza pausar un emprendimiento pendiente y no cambia el estado", async () => {
    const id = await createWithStatus("PENDIENTE");
    const { sent, service } = fakeNotifications();

    const outcome = await pauseBusiness(id, "Un motivo", service);

    expect(outcome).toEqual({ ok: false, reason: "INVALID_STATUS" });
    expect((await findBusinessById(id))?.status).toBe("PENDIENTE");
    expect(sent).toHaveLength(0);
  });

  it("reactiva un emprendimiento pausado", async () => {
    const id = await createWithStatus("PAUSADO");
    const { sent, service } = fakeNotifications();

    const outcome = await reactivateBusiness(id, service);

    expect(outcome.ok).toBe(true);
    expect((await findBusinessById(id))?.status).toBe("APROBADO");
    expect(sent[0]?.message).toMatch(/reactivado/i);
  });

  // Cobertura exhaustiva de la tabla de transiciones del §6.
  it.each([
    ["aprobar", "APROBADO"],
    ["aprobar", "PAUSADO"],
    ["pausar", "PENDIENTE"],
    ["pausar", "PAUSADO"],
    ["reactivar", "PENDIENTE"],
    ["reactivar", "APROBADO"],
  ] as const)(
    "rechaza %s desde el estado %s",
    async (accion, estado) => {
      const id = await createWithStatus(estado);
      const { service } = fakeNotifications();

      const outcome =
        accion === "aprobar"
          ? await approveBusiness(id, service)
          : accion === "pausar"
            ? await pauseBusiness(id, "Un motivo", service)
            : await reactivateBusiness(id, service);

      expect(outcome).toEqual({ ok: false, reason: "INVALID_STATUS" });
      expect((await findBusinessById(id))?.status).toBe(estado);
    },
  );

  it("devuelve NOT_FOUND para un emprendimiento inexistente", async () => {
    const { service } = fakeNotifications();
    expect(await approveBusiness("no-existe", service)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });
});

describe("eliminación por baja lógica (Gherkin 0.2)", () => {
  it("registra fecha y motivo, y oculta el emprendimiento", async () => {
    const id = await createWithStatus("APROBADO");
    const { sent, service } = fakeNotifications();

    const outcome = await deleteBusiness(id, "Incumplimiento de normas", service);

    expect(outcome.ok).toBe(true);

    // La fila sigue existiendo (histórico), pero deja de ser visible.
    const raw = await db.business.findUnique({ where: { id } });
    expect(raw?.deletedAt).toBeInstanceOf(Date);
    expect(raw?.deleteReason).toBe("Incumplimiento de normas");

    expect(await findBusinessById(id)).toBeNull();
    expect(await listBusinessesByOwner(ownerId)).toHaveLength(0);
    expect(sent[0]?.message).toContain("Incumplimiento de normas");
  });

  it("se puede eliminar desde cualquier estado", async () => {
    const { service } = fakeNotifications();

    for (const estado of ["PENDIENTE", "APROBADO", "PAUSADO"] as const) {
      const id = await createWithStatus(estado, `${INPUT.name} ${estado}`);
      expect((await deleteBusiness(id, "Motivo", service)).ok).toBe(true);
    }
  });

  it("un emprendimiento eliminado ya no admite transiciones", async () => {
    const id = await createWithStatus("APROBADO");
    const { service } = fakeNotifications();
    await deleteBusiness(id, "Motivo", service);

    expect(await pauseBusiness(id, "Otro", service)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
    expect(await reactivateBusiness(id, service)).toEqual({
      ok: false,
      reason: "NOT_FOUND",
    });
  });
});
