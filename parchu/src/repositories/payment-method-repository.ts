import type { PaymentMethod, PaymentType } from "@prisma/client";
import type { Prisma } from "@prisma/client";

import { db } from "@/lib/db";

export async function createPaymentMethod(
  businessId: string,
  type: PaymentType,
  details: Prisma.InputJsonValue,
): Promise<PaymentMethod> {
  return db.paymentMethod.create({
    data: { businessId, type, details },
  });
}

export async function listPaymentMethodsByBusiness(
  businessId: string,
): Promise<PaymentMethod[]> {
  return db.paymentMethod.findMany({
    where: { businessId },
    orderBy: { createdAt: "desc" },
  });
}
