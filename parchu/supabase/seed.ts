/**
 * Seed de datos de demo para Supabase (local o remoto).
 *
 * Uso: `npm run db:seed` (tsx supabase/seed.ts).
 * Lee las credenciales de .env.local (o .env.test). Usa la service-role key y
 * la Admin API de Auth para crear usuarios ya confirmados. El trigger
 * on_auth_user_created crea cada profile con rol EMPRENDEDOR; el admin se
 * promueve después.
 */
import { existsSync } from "node:fs";

import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: existsSync(".env.local") ? ".env.local" : ".env.test" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  throw new Error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (.env.local/.env.test)",
  );
}

const sb = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const DEMO_PASSWORD = "DemoParchU1";

type Role = "EMPRENDEDOR" | "ADMIN";

async function upsertUser(
  email: string,
  firstName: string,
  lastName: string | null,
  role: Role,
): Promise<string> {
  // Idempotente: si ya existe, lo busca; si no, lo crea confirmado.
  const existing = await sb.auth.admin.listUsers();
  const found = existing.data.users.find((u) => u.email === email);

  let userId: string;
  if (found) {
    userId = found.id;
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { firstName, lastName },
    });
    if (error || !data.user) throw error ?? new Error(`No se creó ${email}`);
    userId = data.user.id;
  }

  // El trigger crea el profile EMPRENDEDOR; se corrige el rol si corresponde.
  await sb.from("profiles").update({ role }).eq("id", userId);
  return userId;
}

async function main() {
  // eslint-disable-next-line no-console
  console.log("Sembrando datos de demo...");

  await upsertUser("admin@parchu.edu", "Admin", "ParchU", "ADMIN");

  const sellers = [
    { email: "cami@uni.edu", firstName: "Camila", lastName: "Rojas" },
    { email: "jd@uni.edu", firstName: "Juan David", lastName: "Marín" },
  ];

  const businesses = [
    {
      ownerEmail: "cami@uni.edu",
      name: "Postres de Cami",
      description: "Brownies, galletas y postres por encargo.",
      category: "Comida",
      contactInfo: "300 111 2222",
      status: "APROBADO" as const,
      products: [
        { name: "Brownie clásico", price: 6000, category: "Comida", stock: 20, salesCount: 12 },
        { name: "Caja x6 galletas", price: 15000, category: "Comida", stock: 10, salesCount: 5 },
      ],
    },
    {
      ownerEmail: "jd@uni.edu",
      name: "TechParts JD",
      description: "Accesorios y repuestos para tus dispositivos.",
      category: "Tecnología",
      contactInfo: "301 333 4444",
      status: "PENDIENTE" as const,
      products: [],
    },
  ];

  const ownerIds = new Map<string, string>();
  for (const s of sellers) {
    ownerIds.set(s.email, await upsertUser(s.email, s.firstName, s.lastName, "EMPRENDEDOR"));
  }

  for (const b of businesses) {
    const ownerId = ownerIds.get(b.ownerEmail)!;

    // Idempotente por nombre único.
    const { data: existingBiz } = await sb
      .from("Business")
      .select("id")
      .eq("name", b.name)
      .maybeSingle();

    let businessId: string;
    if (existingBiz) {
      businessId = existingBiz.id;
    } else {
      const { data, error } = await sb
        .from("Business")
        .insert({
          ownerId,
          name: b.name,
          description: b.description,
          category: b.category,
          contactInfo: b.contactInfo,
          status: b.status,
        })
        .select("id")
        .single();
      if (error || !data) throw error ?? new Error(`No se creó ${b.name}`);
      businessId = data.id;

      await sb.from("PaymentMethod").insert({
        businessId,
        type: "NEQUI",
        details: { numero: "300 111 2222" },
      });
    }

    for (const p of b.products) {
      const { data: existingProduct } = await sb
        .from("Product")
        .select("id")
        .eq("businessId", businessId)
        .eq("name", p.name)
        .maybeSingle();
      if (!existingProduct) {
        await sb.from("Product").insert({ businessId, ...p, status: "PUBLICADO" });
      }
    }
  }

  // eslint-disable-next-line no-console
  console.log("Seed completado. Admin: admin@parchu.edu / " + DEMO_PASSWORD);
}

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exit(1);
});
