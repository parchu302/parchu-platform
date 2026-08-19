"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth-guard";
import { readField } from "@/lib/form-data";
import { checkRateLimit } from "@/lib/rate-limit";
import { reasonSchema } from "@/lib/validations/business";
import { requireApprovedBusiness } from "@/services/business-service";
import {
  MAX_FAILED_CODE_ATTEMPTS,
  cancelOrder,
  markOrderDelivered,
  receiveOrder,
  validateOrderCode,
} from "@/services/order-service";
import { type OrderActionState } from "./types";

const INVALID_STATUS_MESSAGE: Record<string, string> = {
  receive: "Solo se pueden recibir pedidos pendientes",
  deliver: 'El pedido debe estar en estado "Recibido" para marcarse como entregado',
  cancel: "Un pedido entregado no puede cancelarse",
  validate: 'El pedido debe estar en estado "Entregado" para validar el código',
};

// Cubre las cuatro sub-acciones, incluida la validacion de codigo. El bloqueo
// permanente por 3 intentos (codeLocked) ya cubre el intento de adivinar un
// codigo puntual; esto es un tope de volumen adicional por sesion, defensa en
// profundidad contra una sesion comprometida o un script golpeando el panel.
const ACTOR_LIMIT = { limit: 60, windowMs: 60_000 };

export async function manageOrderAction(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  const session = await requireRole("EMPRENDEDOR");

  const rate = await checkRateLimit(
    `manage-order:${session.userId}`,
    ACTOR_LIMIT,
  );
  if (!rate.allowed) {
    return {
      status: "error",
      message: "Demasiadas acciones seguidas. Espera un momento e intenta de nuevo.",
    };
  }

  const action = readField(formData, "action");
  const orderId = readField(formData, "orderId");
  const businessId = readField(formData, "businessId");

  // El emprendimiento debe ser suyo y estar aprobado; el pedido, ademas, de
  // ese emprendimiento (lo impone el scoping del servicio).
  const access = await requireApprovedBusiness(businessId, session.userId);
  if (!access.ok) {
    return {
      status: "error",
      message:
        access.reason === "NOT_APPROVED"
          ? "Ese emprendimiento aún no ha sido aprobado."
          : "No encontramos ese emprendimiento.",
    };
  }

  let outcome:
    | Awaited<ReturnType<typeof receiveOrder>>
    | Awaited<ReturnType<typeof validateOrderCode>>;

  switch (action) {
    case "receive":
      outcome = await receiveOrder(orderId, businessId);
      break;

    case "deliver":
      outcome = await markOrderDelivered(orderId, businessId);
      break;

    case "cancel": {
      const parsedReason = reasonSchema.safeParse(readField(formData, "reason"));
      if (!parsedReason.success) {
        return {
          status: "error",
          message: parsedReason.error.issues[0]?.message ?? "Motivo inválido",
        };
      }
      outcome = await cancelOrder(orderId, businessId, parsedReason.data);
      break;
    }

    case "validate": {
      const code = readField(formData, "code").trim();
      if (!code) {
        return { status: "error", message: "Ingresa el código de confirmación" };
      }
      outcome = await validateOrderCode(orderId, businessId, code);
      break;
    }

    default:
      return { status: "error", message: "Acción desconocida" };
  }

  revalidatePath(`/panel/${businessId}/pedidos`);

  if (outcome.ok) {
    return {
      status: "success",
      message:
        action === "validate"
          ? "Código correcto: el pedido quedó completado."
          : "Listo.",
    };
  }

  switch (outcome.reason) {
    case "NOT_FOUND":
      return { status: "error", message: "Ese pedido ya no existe." };

    case "INVALID_STATUS":
      return {
        status: "error",
        message: INVALID_STATUS_MESSAGE[action] ?? "Transición no permitida",
      };

    case "INCORRECT_CODE":
      return {
        status: "error",
        message: `El código es incorrecto. Intento ${outcome.failedAttempts} de ${MAX_FAILED_CODE_ATTEMPTS}.`,
      };

    case "LOCKED":
      return {
        status: "error",
        message:
          "Se alcanzó el límite de intentos: se requiere soporte del administrador para desbloquear este pedido.",
      };

    default:
      return { status: "error", message: "No se pudo completar la acción." };
  }
}
