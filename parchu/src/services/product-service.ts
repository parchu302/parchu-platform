import type { Product } from "@prisma/client";

import type { ProductInput } from "@/lib/validations/product";
import { createProduct } from "@/repositories/product-repository";
import { requireApprovedBusiness } from "@/services/business-service";

export type CreateProductOutcome =
  | { ok: true; product: Product }
  | { ok: false; reason: "NOT_FOUND" | "NOT_APPROVED" };

export async function registerProduct(
  businessId: string,
  ownerId: string,
  input: ProductInput,
): Promise<CreateProductOutcome> {
  const access = await requireApprovedBusiness(businessId, ownerId);
  if (!access.ok) {
    return access;
  }

  // Nace PUBLICADO por defecto (definido en el schema): no requiere una
  // aprobacion adicional a la del emprendimiento.
  const product = await createProduct(businessId, input);
  return { ok: true, product };
}
