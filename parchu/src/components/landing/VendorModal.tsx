"use client";

import { useEffect } from "react";

import { type Vendor, whatsappUrl } from "./vendors";

type VendorModalProps = {
  vendor: Vendor | null;
  onClose: () => void;
};

export function VendorModal({ vendor, onClose }: VendorModalProps) {
  useEffect(() => {
    if (!vendor) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [vendor, onClose]);

  if (!vendor) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-5"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="vendor-modal-title"
        className="relative max-h-[90vh] w-[min(720px,100%)] overflow-auto rounded-lg border-[3px] border-ink bg-paper p-[30px] shadow-[8px_10px_0_rgba(43,33,24,.25)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          className="absolute right-3.5 top-3 h-[38px] w-[38px] cursor-pointer rounded border-2 border-ink bg-paper text-xl font-bold"
        >
          ×
        </button>

        <div className="mb-5 border-b-2 border-dashed border-line pb-[18px]">
          <div className="mb-2.5 font-mono text-[13px] font-bold uppercase tracking-[.12em] text-teal">
            {vendor.category}
          </div>
          <h2
            id="vendor-modal-title"
            className="my-[5px] font-display text-[34px]"
          >
            {vendor.name}
          </h2>
          <p>{vendor.description}</p>
        </div>

        <h3 className="text-lg font-semibold">Productos</h3>
        <div className="my-5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5">
          {vendor.products.map((product) => (
            <div
              key={product.name}
              className="rounded-[5px] border-[1.5px] border-line bg-[#FAF6EC] p-4"
            >
              <strong className="mb-[5px] block text-base">
                {product.name}
              </strong>
              <span className="font-mono font-bold text-coral">
                {product.price}
              </span>
            </div>
          ))}
        </div>

        <a
          href={whatsappUrl(vendor)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block rounded border-2 border-ink bg-teal px-5 py-3.5 font-bold text-white no-underline"
        >
          💬 Pedir por WhatsApp
        </a>
        <p className="mt-3.5 text-[13px] text-ink/70">
          La compra se coordina directamente con el emprendimiento. ParchU
          conecta al cliente con el vendedor.
        </p>
      </div>
    </div>
  );
}
