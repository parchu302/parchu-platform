import { createAdminClient } from "@/lib/supabase/admin";
import type { Business, BusinessStatus } from "@/lib/types";
import type { BusinessInput } from "@/lib/validations/business";

// Toda lectura de negocio filtra la baja logica: un emprendimiento eliminado
// deja de existir para la aplicacion, aunque su historico se conserve.

export async function createBusiness(
  ownerId: string,
  input: BusinessInput,
): Promise<Business> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Business")
    .insert({ ...input, ownerId })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function findBusinessById(id: string): Promise<Business | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Business")
    .select("*")
    .eq("id", id)
    .is("deletedAt", null)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// A diferencia del resto de lecturas, esta NO filtra la baja logica: el indice
// unico de `name` es global e incluye los eliminados, asi que un nombre de un
// emprendimiento dado de baja sigue reservado. Consultarlo sin el filtro
// permite devolver un error claro en vez de estrellarse contra el constraint.
export async function findBusinessByNameIncludingDeleted(
  name: string,
): Promise<Business | null> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Business")
    .select("*")
    .eq("name", name)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function listBusinessesByOwner(
  ownerId: string,
): Promise<Business[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Business")
    .select("*")
    .eq("ownerId", ownerId)
    .is("deletedAt", null)
    .order("createdAt", { ascending: true });
  if (error) throw error;
  return data;
}

export async function listAllBusinesses(): Promise<
  (Business & { owner: { email: string; firstName: string } })[]
> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Business")
    .select("*, owner:profiles!Business_ownerId_fkey(email, firstName)")
    .is("deletedAt", null)
    .order("status", { ascending: true })
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data as unknown as (Business & {
    owner: { email: string; firstName: string };
  })[];
}

export async function updateBusinessStatus(
  id: string,
  status: BusinessStatus,
): Promise<Business> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Business")
    .update({ status })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function softDeleteBusiness(
  id: string,
  reason: string,
): Promise<Business> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Business")
    .update({ deletedAt: new Date().toISOString(), deleteReason: reason })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function countPlatformStats(): Promise<{
  businesses: number;
  products: number;
  orders: number;
  pendingBusinesses: number;
}> {
  const sb = createAdminClient();
  const [businesses, products, orders, pendingBusinesses] = await Promise.all([
    sb
      .from("Business")
      .select("*", { count: "exact", head: true })
      .is("deletedAt", null),
    sb
      .from("Product")
      .select("id, business:Business!inner(deletedAt)", {
        count: "exact",
        head: true,
      })
      .is("business.deletedAt", null),
    sb.from("Order").select("*", { count: "exact", head: true }),
    sb
      .from("Business")
      .select("*", { count: "exact", head: true })
      .is("deletedAt", null)
      .eq("status", "PENDIENTE"),
  ]);

  for (const result of [businesses, products, orders, pendingBusinesses]) {
    if (result.error) throw result.error;
  }

  return {
    businesses: businesses.count ?? 0,
    products: products.count ?? 0,
    orders: orders.count ?? 0,
    pendingBusinesses: pendingBusinesses.count ?? 0,
  };
}
