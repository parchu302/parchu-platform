"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth-guard";
import { readField } from "@/lib/form-data";
import { unlockOrderCode } from "@/services/order-service";
import { type OrderActionState } from "./types";

// Solo el administrador puede desbloquear: se verifica aqui, no solo en el
// proxy, porque las Server Actions son alcanzables por POST directo.
export async function unlockOrderAction(
  _prevState: OrderActionState,
  formData: FormData,
): Promise<OrderActionState> {
  await requireRole("ADMIN");

  const orderId = readField(formData, "orderId");
  const outcome = await unlockOrderCode(orderId);

  revalidatePath("/admin/pedidos");

  if (outcome.ok) {
    return {
      status: "success",
      message:
        "Código regenerado. El cliente ya puede verlo en su enlace de seguimiento.",
    };
  }

  return {
    status: "error",
    message:
      outcome.reason === "NOT_LOCKED"
        ? "Ese pedido no requiere desbloqueo."
        : "Ese pedido ya no existe.",
  };
}
