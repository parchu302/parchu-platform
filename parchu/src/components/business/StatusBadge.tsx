import type { BusinessStatus } from "@prisma/client";

const LABEL: Record<BusinessStatus, string> = {
  PENDIENTE: "Pendiente de aprobación",
  APROBADO: "Aprobado",
  PAUSADO: "Pausado",
};

const STYLE: Record<BusinessStatus, string> = {
  PENDIENTE: "border-mustard bg-mustard/20 text-ink",
  APROBADO: "border-teal bg-teal/15 text-teal",
  PAUSADO: "border-coral bg-coral/15 text-coral",
};

export function StatusBadge({ status }: { status: BusinessStatus }) {
  return (
    <span
      data-status={status}
      className={`inline-block rounded-full border-2 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[.06em] ${STYLE[status]}`}
    >
      {LABEL[status]}
    </span>
  );
}

export const STATUS_LABEL = LABEL;
