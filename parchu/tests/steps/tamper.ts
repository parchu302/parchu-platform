// La sesion de Supabase vive en cookies sb-<ref>-auth-token (a veces en
// fragmentos .0, .1...) con valor "base64-<json>" ({access_token,
// refresh_token,...}). Se reensambla, se corrompe la firma del access_token y
// el refresh_token (si no, el proxy refrescaria la sesion) y se devuelve una
// unica cookie sin fragmentos.
type Cookie = {
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
  httpOnly: boolean;
  secure: boolean;
  sameSite: "Strict" | "Lax" | "None";
};

const SESSION = /^(sb-.+-auth-token)(?:\.(\d+))?$/;
const PREFIX = "base64-";

function flip(value: string): string {
  // Cambia un caracter del centro: los ultimos bits de base64 pueden ser
  // irrelevantes, los del centro no.
  const middle = Math.floor(value.length / 2);
  const replacement = value[middle] === "a" ? "b" : "a";
  return value.slice(0, middle) + replacement + value.slice(middle + 1);
}

export function tamperSessionCookies(cookies: Cookie[]): Cookie[] {
  const parts = cookies
    .map((cookie) => ({ cookie, match: SESSION.exec(cookie.name) }))
    .filter((entry) => entry.match);
  if (parts.length === 0) return [];

  const baseName = parts[0]!.match![1]!;
  const joined = parts
    .sort((a, b) => Number(a.match![2] ?? 0) - Number(b.match![2] ?? 0))
    .map((entry) => entry.cookie.value)
    .join("");

  const raw = joined.startsWith(PREFIX) ? joined.slice(PREFIX.length) : joined;
  const session = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));

  const [header, payload, signature] = String(session.access_token).split(".");
  session.access_token = [header, payload, flip(signature ?? "x")].join(".");
  session.refresh_token = flip(String(session.refresh_token));

  const value =
    PREFIX + Buffer.from(JSON.stringify(session), "utf8").toString("base64url");

  return [{ ...parts[0]!.cookie, name: baseName, value }];
}
