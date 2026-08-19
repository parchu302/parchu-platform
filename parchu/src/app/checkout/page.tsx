import Link from "next/link";
import type { Metadata } from "next";

import { removeFromCartAction } from "@/actions/cart/manage-cart";
import {
  CheckoutForm,
  type CheckoutPaymentOption,
} from "@/components/checkout/CheckoutForm";
import { readCart } from "@/lib/cart";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/format";
import { PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";

export const metadata: Metadata = {
  title: "Tu pedido — ParchU",
};

function EmptyCart() {
  return (
    <main className="mx-auto w-full max-w-[640px] px-6 py-12">
      <h1 className="mb-4 font-display text-[28px]">Tu carrito está vacío</h1>
      <p data-testid="checkout-empty" className="mb-6 text-[15px] text-ink/75">
        Agrega productos desde el tablero para hacer tu pedido.
      </p>
      <Link
        href="/productos"
        className="inline-block rounded-[3px] border-2 border-ink bg-ink px-[26px] py-[15px] text-[15.5px] font-bold text-paper no-underline"
      >
        Ver el tablero
      </Link>
    </main>
  );
}

export default async function CheckoutPage() {
  const cart = await readCart();

  if (cart.length === 0) return <EmptyCart />;

  const products = await db.product.findMany({
    where: {
      id: { in: cart.map((line) => line.productId) },
      status: "PUBLICADO",
      business: { status: "APROBADO", deletedAt: null },
    },
    select: {
      id: true,
      name: true,
      price: true,
      stock: true,
      businessId: true,
      business: { select: { name: true } },
    },
  });

  if (products.length === 0) return <EmptyCart />;

  const productById = new Map(products.map((product) => [product.id, product]));
  const lines = cart
    .map((line) => {
      const product = productById.get(line.productId);
      return product ? { ...line, product } : null;
    })
    .filter((line) => line !== null);

  const total = lines.reduce(
    (accumulator, line) =>
      accumulator + Number(line.product.price) * line.quantity,
    0,
  );

  const businessId = products[0]!.businessId;
  const paymentMethods = await db.paymentMethod.findMany({
    where: { businessId },
    select: { id: true, type: true },
    orderBy: { createdAt: "asc" },
  });

  const options: CheckoutPaymentOption[] = paymentMethods.map((method) => ({
    id: method.id,
    label: PAYMENT_METHOD_LABEL[method.type],
  }));

  return (
    <main className="mx-auto w-full max-w-[720px] px-6 py-12">
      <Link href="/productos" className="font-mono text-xs font-bold text-teal">
        ← Seguir viendo el tablero
      </Link>

      <h1 className="mb-2 mt-4 font-display text-[28px]">Tu pedido</h1>
      <p className="mb-8 text-[14.5px] text-ink/75">
        {products[0]!.business.name}
      </p>

      <section className="mb-8 rounded-lg border-2 border-ink bg-paper-2 p-6">
        <ul className="grid list-none gap-4 p-0">
          {lines.map((line) => (
            <li
              key={line.productId}
              data-cart-item={line.product.name}
              className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-dashed border-line pb-3 last:border-0 last:pb-0"
            >
              <div>
                <strong className="block text-[15px]">
                  {line.product.name}
                </strong>
                <span className="text-[13px] text-ink/70">
                  {line.quantity} × {formatPrice(line.product.price)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-mono text-[14px] font-bold text-coral">
                  {formatPrice(Number(line.product.price) * line.quantity)}
                </span>
                <form action={removeFromCartAction}>
                  <input
                    type="hidden"
                    name="productId"
                    value={line.productId}
                  />
                  <button
                    type="submit"
                    className="cursor-pointer rounded border-2 border-ink bg-paper px-3 py-1 font-mono text-[11px] font-bold uppercase"
                  >
                    Quitar
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-5 flex justify-between border-t-2 border-ink pt-4 font-display text-[18px]">
          <span>Total</span>
          <span data-testid="checkout-total">{formatPrice(total)}</span>
        </p>
      </section>

      {options.length === 0 ? (
        <p
          role="alert"
          className="rounded border-2 border-coral bg-coral/10 px-3 py-2 text-[13.5px] font-semibold text-coral"
        >
          Este emprendimiento todavía no registró formas de pago.
        </p>
      ) : (
        <section className="rounded-lg border-2 border-ink bg-paper-2 p-6">
          <h2 className="mb-5 font-display text-[20px]">Tus datos</h2>
          <CheckoutForm paymentMethods={options} />
        </section>
      )}
    </main>
  );
}
