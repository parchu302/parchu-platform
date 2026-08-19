import Link from "next/link";

import { readCart } from "@/lib/cart";

// Server Component: se re-renderiza automaticamente despues de cada Server
// Action (addToCartAction hace revalidatePath("/productos")), asi que el
// contador queda al dia sin JavaScript de cliente adicional.
export async function CartSummaryLink() {
  const cart = await readCart();

  if (cart.length === 0) return null;

  const totalItems = cart.reduce((sum, line) => sum + line.quantity, 0);

  return (
    <Link
      href="/checkout"
      data-testid="cart-summary-link"
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full border-2 border-ink bg-ink px-5 py-3 font-mono text-[13px] font-bold text-paper no-underline shadow-[3px_5px_10px_rgba(43,33,24,.3)]"
    >
      🛒 Ver pedido
      <span
        data-testid="cart-summary-count"
        className="flex h-6 w-6 items-center justify-center rounded-full bg-coral text-[12px]"
      >
        {totalItems}
      </span>
    </Link>
  );
}
