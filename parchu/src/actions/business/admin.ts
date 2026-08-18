"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth-guard";
import { readField } from "@/lib/form-data";
import { reasonSchema } from "@/lib/validations/business";
import {
  approveBusiness,
  deleteBusiness,
  pauseBusiness,
  reactivateBusiness,
  type TransitionOutcome,
} from "@/services/business-service";
import { type AdminActionState } from "./types";

const INVALID_STATUS_MESSAGE: Record<string, string> = {
  pause: "Solo se pueden pausar emprendimientos aprobados",
  approve: "Solo se pueden aprobar emprendimientos pendientes de aprobación",
  reactivate: "Solo se pueden reactivar emprendimientos pausados",
};

const SUCCESS_MESSAGE: Record<string, string> = {
  approve: "Emprendimiento aprobado",
  pause: "Emprendimiento pausado",
  reactivate: "Emprendimiento reactivado",
  delete: "Emprendimiento eliminado",
};

export async function businessAdminAction(
  _prevState: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireRole("ADMIN");

  const action = readField(formData, "action");
  const businessId = readField(formData, "businessId");

  if (!businessId) {
    return { status: "error", message: "Falta el emprendimiento" };
  }

  // Pausar y eliminar exigen motivo; eliminar exige ademas confirmacion.
  let reason = "";
  if (action === "pause" || action === "delete") {
    const parsedReason = reasonSchema.safeParse(readField(formData, "reason"));
    if (!parsedReason.success) {
      return {
        status: "error",
        message: parsedReason.error.issues[0]?.message ?? "Motivo inválido",
        businessId,
      };
    }
    reason = parsedReason.data;
  }

  if (action === "delete" && readField(formData, "confirm") !== "on") {
    return {
      status: "error",
      message: "Debes confirmar la eliminación",
      businessId,
    };
  }

  let outcome: TransitionOutcome;
  switch (action) {
    case "approve":
      outcome = await approveBusiness(businessId);
      break;
    case "pause":
      outcome = await pauseBusiness(businessId, reason);
      break;
    case "reactivate":
      outcome = await reactivateBusiness(businessId);
      break;
    case "delete":
      outcome = await deleteBusiness(businessId, reason);
      break;
    default:
      return { status: "error", message: "Acción desconocida", businessId };
  }

  if (!outcome.ok) {
    return {
      status: "error",
      businessId,
      message:
        outcome.reason === "NOT_FOUND"
          ? "El emprendimiento ya no existe"
          : (INVALID_STATUS_MESSAGE[action] ?? "Transición no permitida"),
    };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/emprendimientos");

  return {
    status: "success",
    businessId,
    message: SUCCESS_MESSAGE[action] ?? "Listo",
  };
}
