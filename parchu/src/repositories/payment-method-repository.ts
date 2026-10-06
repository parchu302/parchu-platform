import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { PaymentMethod, PaymentType } from "@/lib/types";

export async function createPaymentMethod(
  businessId: string,
  type: PaymentType,
  details: Json,
): Promise<PaymentMethod> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("PaymentMethod")
    .insert({ businessId, type, details })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listPaymentMethodsByBusiness(
  businessId: string,
): Promise<PaymentMethod[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("PaymentMethod")
    .select("*")
    .eq("businessId", businessId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data;
}
