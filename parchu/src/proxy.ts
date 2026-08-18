import { NextResponse, type NextRequest } from "next/server";

import { SESSION_COOKIE_NAME, decryptSession } from "@/lib/session";

// En Next 16 "middleware" pasa a llamarse "proxy" (middleware.ts esta
// deprecado). Corre siempre en runtime Node.js.
//
// Esto es solo un chequeo optimista de la cookie para redirigir: la
// autorizacion real vive en requireRole(), dentro de cada page/action.

const PROTECTED_PREFIXES = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/panel", role: "EMPRENDEDOR" },
] as const;

const GUEST_ONLY_PATHS = ["/login", "/registro"];

function homePathForRole(role: string): string {
  return role === "ADMIN" ? "/admin" : "/panel";
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const session = await decryptSession(
    request.cookies.get(SESSION_COOKIE_NAME)?.value,
  );

  const rule = PROTECTED_PREFIXES.find(
    (entry) =>
      pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );

  if (rule) {
    // Deny by default: sin sesion valida no se entra.
    if (!session) {
      return NextResponse.redirect(new URL("/login", request.nextUrl));
    }
    if (session.role !== rule.role) {
      return NextResponse.redirect(
        new URL(homePathForRole(session.role), request.nextUrl),
      );
    }
  }

  if (session && GUEST_ONLY_PATHS.includes(pathname)) {
    return NextResponse.redirect(
      new URL(homePathForRole(session.role), request.nextUrl),
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
