import { cookies } from "next/headers";

export const CART_COOKIE_NAME = "parchu_cart";
const MAX_LINES = 20;
const MAX_QUANTITY = 99;

export type CartLine = {
  productId: string;
  quantity: number;
};

// El carrito vive en una cookie httpOnly y solo se modifica desde Server
// Actions: asi el checkout puede leerlo en el servidor (sin depender de
// JavaScript) y el cliente no puede manipularlo desde el navegador.
function parseCart(raw: string | undefined): CartLine[] {
  if (!raw) return [];

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (line): line is CartLine =>
          typeof line === "object" &&
          line !== null &&
          typeof (line as CartLine).productId === "string" &&
          Number.isInteger((line as CartLine).quantity) &&
          (line as CartLine).quantity > 0,
      )
      .slice(0, MAX_LINES)
      .map((line) => ({
        productId: line.productId,
        quantity: Math.min(line.quantity, MAX_QUANTITY),
      }));
  } catch {
    // Cookie corrupta: se trata como carrito vacío en vez de romper la página.
    return [];
  }
}

export async function readCart(): Promise<CartLine[]> {
  const cookieStore = await cookies();
  return parseCart(cookieStore.get(CART_COOKIE_NAME)?.value);
}

export async function writeCart(lines: CartLine[]): Promise<void> {
  const cookieStore = await cookies();

  if (lines.length === 0) {
    cookieStore.delete(CART_COOKIE_NAME);
    return;
  }

  cookieStore.set(CART_COOKIE_NAME, JSON.stringify(lines.slice(0, MAX_LINES)), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearCart(): Promise<void> {
  await writeCart([]);
}
