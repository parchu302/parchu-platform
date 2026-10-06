import { NextResponse, type NextRequest } from "next/server";

import { createServerClient } from "@supabase/ssr";

// En Next 16 "middleware" se llama "proxy". Corre en runtime Node.js.
//
// Dos responsabilidades:
//  1. Refrescar la sesión de Supabase (rota el token y reescribe cookies).
//  2. Chequeo OPTIMISTA de acceso para redirigir. La autorización real vive en
//     requireRole(), dentro de cada page/action.

const PROTECTED_PREFIXES = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/panel", role: "EMPRENDEDOR" },
] as const;

const GUEST_ONLY_PATHS = ["/login", "/registro"];

function homePathForRole(role: string): string {
  return role === "ADMIN" ? "/admin" : "/panel";
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // getUser() valida el token y dispara el refresh si corresponde.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    role = profile?.role ?? null;
  }

  const rule = PROTECTED_PREFIXES.find(
    (entry) =>
      pathname === entry.prefix || pathname.startsWith(`${entry.prefix}/`),
  );

  if (rule) {
    // Deny by default: sin sesión válida no se entra.
    if (!user) {
      return NextResponse.redirect(new URL("/login", request.nextUrl));
    }
    if (role !== rule.role) {
      return NextResponse.redirect(
        new URL(homePathForRole(role ?? "EMPRENDEDOR"), request.nextUrl),
      );
    }
  }

  if (user && GUEST_ONLY_PATHS.includes(pathname)) {
    return NextResponse.redirect(
      new URL(homePathForRole(role ?? "EMPRENDEDOR"), request.nextUrl),
    );
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
