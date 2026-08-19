import { headers } from "next/headers";

// Mejor esfuerzo: en Vercel, x-forwarded-for trae la IP real del cliente.
// En desarrollo local (sin proxy) no existe, y se agrupa todo bajo "local".
export async function getRequestIp(): Promise<string> {
  const headerList = await headers();
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();

  return headerList.get("x-real-ip") ?? "local";
}
