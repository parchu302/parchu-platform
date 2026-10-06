import { createAdminClient } from "@/lib/supabase/admin";
import type { SellerLeadInput } from "@/lib/validations/lead";

export async function createSellerLead(
  input: SellerLeadInput,
): Promise<{ id: string }> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("SellerLead")
    .insert(input)
    .select("id")
    .single();
  if (error) throw error;
  return data;
}
