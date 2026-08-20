import type { Product } from "@prisma/client";

import { db } from "@/lib/db";
import type { ProductInput } from "@/lib/validations/product";

export async function createProduct(
  businessId: string,
  input: ProductInput,
): Promise<Product> {
  return db.product.create({
    data: {
      businessId,
      name: input.name,
      description: input.description,
      imageBase64: input.image,
      price: input.price,
      category: input.category,
      stock: input.stock,
    },
  });
}

export async function listProductsByBusiness(
  businessId: string,
): Promise<Product[]> {
  return db.product.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });
}
