import { createAdminClient } from "@/lib/supabase/admin";
import type { Product } from "@/lib/types";
import type { ProductInput } from "@/lib/validations/product";

export async function createProduct(
  businessId: string,
  input: ProductInput,
): Promise<Product> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Product")
    .insert({
      businessId,
      name: input.name,
      description: input.description,
      imageBase64: input.image,
      price: Number(input.price),
      category: input.category,
      stock: input.stock,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listProductsByBusiness(
  businessId: string,
): Promise<Product[]> {
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("Product")
    .select("*")
    .eq("businessId", businessId)
    .order("createdAt", { ascending: false });
  if (error) throw error;
  return data;
}
