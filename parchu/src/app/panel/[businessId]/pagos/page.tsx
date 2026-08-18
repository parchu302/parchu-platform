import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { NotApprovedNotice } from "@/components/catalog/NotApprovedNotice";
import { PaymentMethodForm } from "@/components/catalog/PaymentMethodForm";
import { requireRole } from "@/lib/auth-guard";
import { PAYMENT_METHOD_LABEL } from "@/lib/payment-methods";
import { listPaymentMethodsByBusiness } from "@/repositories/payment-method-repository";
import { requireApprovedBusiness } from "@/services/business-service";

export const metadata: Metadata = {
  title: "Formas de pago — ParchU",
};

function describeDetails(details: unknown): string {
  if (!details || typeof details !== "object") return "";
  return Object.values(details as Record<string, unknown>)
    .filter((value) => typeof value === "string" && value.length > 0)
    .join(" · ");
}

export default async function PagosPage({
  params,
}: PageProps<"/panel/[businessId]/pagos">) {
  const session = await requireRole("EMPRENDEDOR");
  const { businessId } = await params;

  const access = await requireApprovedBusiness(businessId, session.userId);

  if (!access.ok) {
    if (access.reason === "NOT_FOUND") notFound();
    return <NotApprovedNotice what="formas de pago" />;
  }

  const paymentMethods = await listPaymentMethodsByBusiness(businessId);

  return (
    <div className="grid gap-8">
      <section className="rounded-lg border-2 border-ink bg-paper-2 p-8">
        <h2 className="mb-5 font-display text-[20px]">Nueva forma de pago</h2>
        <PaymentMethodForm businessId={businessId} />
      </section>

      <section>
        <h2 className="mb-4 font-display text-[20px]">
          Registradas ({paymentMethods.length})
        </h2>

        {paymentMethods.length === 0 ? (
          <p className="text-[14.5px] text-ink/70">
            Todavía no has registrado formas de pago.
          </p>
        ) : (
          <ul className="grid list-none gap-4 p-0">
            {paymentMethods.map((method) => (
              <li
                key={method.id}
                data-payment-type={method.type}
                className="rounded border-2 border-ink bg-paper p-5"
              >
                <strong className="block font-display text-[16px]">
                  {PAYMENT_METHOD_LABEL[method.type]}
                </strong>
                <span className="text-[13.5px] text-ink/75">
                  {describeDetails(method.details) || "Sin datos adicionales"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
