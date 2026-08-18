import { Prisma, type Business, type BusinessStatus } from "@prisma/client";

import type { BusinessInput } from "@/lib/validations/business";
import {
  createBusiness,
  findBusinessById,
  findBusinessByNameIncludingDeleted,
  softDeleteBusiness,
  updateBusinessStatus,
} from "@/repositories/business-repository";
import {
  notificationService,
  type NotificationService,
} from "@/services/notification-service";

export type RegisterBusinessOutcome =
  | { ok: true; business: Business }
  | { ok: false; reason: "NAME_TAKEN" };

export type TransitionOutcome =
  | { ok: true; business: Business }
  | { ok: false; reason: "NOT_FOUND" | "INVALID_STATUS" };

// Maquina de estados del §6. Lo que no esta en esta tabla, se rechaza:
//   PENDIENTE --aprobar--> APROBADO --pausar--> PAUSADO --reactivar--> APROBADO
const ALLOWED_SOURCE_STATUS = {
  approve: ["PENDIENTE"],
  pause: ["APROBADO"],
  reactivate: ["PAUSADO"],
} as const satisfies Record<string, readonly BusinessStatus[]>;

type TransitionAction = keyof typeof ALLOWED_SOURCE_STATUS;

function isUniqueNameViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function registerBusiness(
  ownerId: string,
  input: BusinessInput,
): Promise<RegisterBusinessOutcome> {
  const existing = await findBusinessByNameIncludingDeleted(input.name);
  if (existing) {
    return { ok: false, reason: "NAME_TAKEN" };
  }

  try {
    // Nace PENDIENTE por defecto (definido en el schema).
    const business = await createBusiness(ownerId, input);
    return { ok: true, business };
  } catch (error) {
    // Dos altas simultaneas con el mismo nombre: decide el indice unico.
    if (isUniqueNameViolation(error)) {
      return { ok: false, reason: "NAME_TAKEN" };
    }
    throw error;
  }
}

// findBusinessById ya filtra la baja logica, asi que un emprendimiento
// eliminado devuelve NOT_FOUND y no admite ninguna transicion.
async function applyTransition(
  businessId: string,
  action: TransitionAction,
  nextStatus: BusinessStatus,
  buildMessage: (business: Business) => string,
  notifications: NotificationService,
): Promise<TransitionOutcome> {
  const business = await findBusinessById(businessId);
  if (!business) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const allowed: readonly BusinessStatus[] = ALLOWED_SOURCE_STATUS[action];
  if (!allowed.includes(business.status)) {
    return { ok: false, reason: "INVALID_STATUS" };
  }

  const updated = await updateBusinessStatus(businessId, nextStatus);
  await notifications.notify(updated.ownerId, buildMessage(updated));

  return { ok: true, business: updated };
}

export async function approveBusiness(
  businessId: string,
  notifications: NotificationService = notificationService,
): Promise<TransitionOutcome> {
  return applyTransition(
    businessId,
    "approve",
    "APROBADO",
    (business) =>
      `Tu emprendimiento "${business.name}" fue aprobado. Ya puedes publicar productos.`,
    notifications,
  );
}

export async function pauseBusiness(
  businessId: string,
  reason: string,
  notifications: NotificationService = notificationService,
): Promise<TransitionOutcome> {
  return applyTransition(
    businessId,
    "pause",
    "PAUSADO",
    (business) =>
      `Tu emprendimiento "${business.name}" fue pausado y sus productos dejaron de ser visibles. Motivo: ${reason}`,
    notifications,
  );
}

export async function reactivateBusiness(
  businessId: string,
  notifications: NotificationService = notificationService,
): Promise<TransitionOutcome> {
  return applyTransition(
    businessId,
    "reactivate",
    "APROBADO",
    (business) =>
      `Tu emprendimiento "${business.name}" fue reactivado y sus productos vuelven a ser visibles.`,
    notifications,
  );
}

// La eliminacion es baja logica y se admite desde cualquier estado: marca
// fecha y motivo, oculta el emprendimiento y sus productos, y conserva el
// historico de pedidos.
export async function deleteBusiness(
  businessId: string,
  reason: string,
  notifications: NotificationService = notificationService,
): Promise<TransitionOutcome> {
  const business = await findBusinessById(businessId);
  if (!business) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  const deleted = await softDeleteBusiness(businessId, reason);
  await notifications.notify(
    deleted.ownerId,
    `Tu emprendimiento "${deleted.name}" fue eliminado de la plataforma. Motivo: ${reason}`,
  );

  return { ok: true, business: deleted };
}

export function isApproved(business: Business): boolean {
  return business.status === "APROBADO" && business.deletedAt === null;
}

export type ApprovedBusinessOutcome =
  | { ok: true; business: Business }
  | { ok: false; reason: "NOT_FOUND" | "NOT_APPROVED" };

// Precondicion compartida por productos y formas de pago: el emprendimiento
// debe existir, ser del emprendedor y estar aprobado. Vive aqui para que la
// regla no se duplique en cada servicio que la necesita.
export async function requireApprovedBusiness(
  businessId: string,
  ownerId: string,
): Promise<ApprovedBusinessOutcome> {
  const business = await findBusinessById(businessId);

  // Mismo resultado para "no existe" y "es de otro emprendedor".
  if (!business || business.ownerId !== ownerId) {
    return { ok: false, reason: "NOT_FOUND" };
  }

  if (!isApproved(business)) {
    return { ok: false, reason: "NOT_APPROVED" };
  }

  return { ok: true, business };
}
