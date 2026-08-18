import { db } from "@/lib/db";
import type { SellerLeadInput } from "@/lib/validations/lead";

export async function createSellerLead(
  input: SellerLeadInput,
): Promise<{ id: string }> {
  return db.sellerLead.create({
    data: input,
    select: { id: true },
  });
}
