"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { clearCart, readCart } from "@/lib/cart";
import { readField } from "@/lib/form-data";
import { checkoutSchema } from "@/lib/validations/checkout";
import { createGuestOrder } from "@/services/order-service";
import { type CheckoutFormState } from "./types";

const MESSAGE_BY_REASON: Record<string, string> = {
  EMPTY_CART: "Tu carrito está vacío.",
  PRODUCT_UNAVAILABLE: "Alguno de los productos ya no está disponible.",
  MULTIPLE_BUSINESSES:
    "Tu carrito tiene productos de más de un emprendimiento.",
  PAYMENT_METHOD_INVALID: "Selecciona una forma de pago disponible.",
  INSUFFICIENT_STOCK: "No hay stock suficiente.",
};

// Compra sin registro: no hay sesión que verificar, pero todos los datos del
// cliente se validan aquí y los precios se releen de la base en el servicio.
export async function createOrderAction(
  _prevState: CheckoutFormState,
  formData: FormData,
): Promise<CheckoutFormState> {
  const parsed = checkoutSchema.safeParse({
    guestName: readField(formData, "guestName"),
    guestContact: readField(formData, "guestContact"),
    paymentMethodId: readField(formData, "paymentMethodId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Revisa los datos para completar tu pedido.",
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const cart = await readCart();
  const outcome = await createGuestOrder(cart, parsed.data);

  if (!outcome.ok) {
    const base = MESSAGE_BY_REASON[outcome.reason] ?? "No pudimos crear tu pedido.";
    return {
      status: "error",
      message:
        outcome.reason === "INSUFFICIENT_STOCK" && outcome.productName
          ? `No hay stock suficiente de ${outcome.productName}.`
          : base,
    };
  }

  await clearCart();

  // El código en claro no viaja por la URL: la página de seguimiento lo
  // descifra a partir del pedido.
  redirect(`/seguimiento/${outcome.trackingToken}?nuevo=1`);
}
