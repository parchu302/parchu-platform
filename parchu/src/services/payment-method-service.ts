import type { PaymentMethod } from "@prisma/client";

import type { PaymentMethodInput } from "@/lib/validations/payment-method";
import { createPaymentMethod } from "@/repositories/payment-method-repository";
import { requireApprovedBusiness } from "@/services/business-service";

export type CreatePaymentMethodOutcome =
  | { ok: true; paymentMethod: PaymentMethod }
  | { ok: false; reason: "NOT_FOUND" | "NOT_APPROVED" };

export async function registerPaymentMethod(
  businessId: string,
  ownerId: string,
  input: PaymentMethodInput,
): Promise<CreatePaymentMethodOutcome> {
  const access = await requireApprovedBusiness(businessId, ownerId);
  if (!access.ok) {
    return access;
  }

  const paymentMethod = await createPaymentMethod(
    businessId,
    input.type,
    input.details,
  );

  return { ok: true, paymentMethod };
}
