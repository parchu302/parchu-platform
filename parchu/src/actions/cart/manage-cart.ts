"use server";

import { revalidatePath } from "next/cache";

import { readCart, writeCart } from "@/lib/cart";
import { readField } from "@/lib/form-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { type CartActionState } from "./types";

async function loadVisibleProduct(productId: string) {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Product")
    .select(
      "id, name, stock, businessId, business:Business!inner(status, deletedAt)",
    )
    .eq("id", productId)
    .eq("status", "PUBLICADO")
    .eq("business.status", "APROBADO")
    .is("business.deletedAt", null)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    stock: data.stock,
    businessId: data.businessId,
  };
}

export async function addToCartAction(
  _prevState: CartActionState,
  formData: FormData,
): Promise<CartActionState> {
  const productId = readField(formData, "productId");
  const product = await loadVisibleProduct(productId);

  if (!product) {
    return { status: "error", message: "Ese producto ya no está disponible." };
  }

  const cart = await readCart();

  // Un pedido pertenece a un solo emprendimiento: el carrito no puede mezclar.
  if (cart.length > 0) {
    const { data: existing, error } = await createAdminClient()
      .from("Product")
      .select("businessId")
      .in(
        "id",
        cart.map((line) => line.productId),
      );
    if (error) throw error;

    if (existing.some((item) => item.businessId !== product.businessId)) {
      return {
        status: "error",
        message:
          "Tu carrito tiene productos de otro emprendimiento. Termina o vacía ese pedido primero.",
      };
    }
  }

  const line = cart.find((item) => item.productId === productId);
  const nextQuantity = (line?.quantity ?? 0) + 1;

  if (nextQuantity > product.stock) {
    return {
      status: "error",
      message: `Solo quedan ${product.stock} unidades de ${product.name}.`,
    };
  }

  if (line) {
    line.quantity = nextQuantity;
  } else {
    cart.push({ productId, quantity: 1 });
  }

  await writeCart(cart);
  revalidatePath("/productos");
  revalidatePath("/checkout");

  return { status: "success", message: `${product.name} agregado al carrito.` };
}

export async function removeFromCartAction(formData: FormData): Promise<void> {
  const productId = readField(formData, "productId");
  const cart = await readCart();

  await writeCart(cart.filter((line) => line.productId !== productId));
  revalidatePath("/checkout");
}
