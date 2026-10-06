import { type NextRequest, NextResponse } from "next/server";

import { type EmailOtpType } from "@supabase/supabase-js";

import { createClient } from "@/lib/supabase/server";

// Callback de confirmación de correo. El enlace del email trae token_hash y
// type; verifyOtp valida y deja la sesión en cookies (cliente SSR). Luego
// redirige al panel. Ante cualquier fallo, vuelve a /login con aviso.
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/panel";

  if (tokenHash && type) {
    const sb = await createClient();
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  return NextResponse.redirect(
    new URL("/login?error=confirmation", request.url),
  );
}
