"use client";

import { useMemo, useState } from "react";

import { VendorModal } from "./VendorModal";
import { CATEGORIES, VENDORS, type Vendor } from "./vendors";

export function VendorBoard() {
  const [activeCategory, setActiveCategory] = useState<string>("Todos");
  const [openVendor, setOpenVendor] = useState<Vendor | null>(null);

  const visibleVendors = useMemo(
    () =>
      activeCategory === "Todos"
        ? VENDORS
        : VENDORS.filter((vendor) => vendor.category === activeCategory),
    [activeCategory],
  );

  return (
    <>
      <div className="flex flex-wrap gap-3">
        {CATEGORIES.map((category) => {
          const isActive = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              aria-pressed={isActive}
              onClick={() => setActiveCategory(category)}
              className={`cursor-pointer rounded-[20px] border-2 px-4 py-2 font-mono text-[13px] font-semibold transition-colors ${
                isActive
                  ? "border-teal bg-teal text-paper"
                  : "border-ink bg-paper hover:bg-paper-2"
              }`}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="mt-11 grid grid-cols-[repeat(auto-fill,minmax(230px,1fr))] gap-[26px]">
        {visibleVendors.map((vendor, index) => (
          <button
            key={vendor.id}
            type="button"
            onClick={() => setOpenVendor(vendor)}
            className={`relative cursor-pointer border-[1.5px] border-line bg-[#FAF6EC] px-[18px] pb-[22px] pt-5 text-left shadow-[3px_5px_10px_rgba(43,33,24,.15)] transition-transform duration-150 before:absolute before:-top-2 before:left-1/2 before:h-4 before:w-[46px] before:-translate-x-1/2 before:-rotate-3 before:bg-mustard/75 before:content-[''] hover:rotate-0 hover:-translate-y-[5px] hover:shadow-[5px_8px_16px_rgba(43,33,24,.18)] ${
              index % 2 === 0 ? "-rotate-[1.4deg]" : "rotate-[1.2deg]"
            }`}
          >
            <div className="font-mono text-[11px] font-bold uppercase tracking-[.08em] text-teal">
              {vendor.category}
            </div>
            <h3 className="mb-1.5 mt-2 font-display text-[17px]">
              {vendor.name}
            </h3>
            <p className="mb-3.5 text-[13.5px] text-ink/80">{vendor.teaser}</p>
            <span className="inline-block -rotate-2 bg-coral px-2.5 py-1 font-mono text-[13.5px] font-bold text-white">
              {vendor.priceLabel}
            </span>
            <span className="mt-4 block font-mono text-xs font-bold text-teal">
              Ver emprendimiento →
            </span>
          </button>
        ))}
      </div>

      <VendorModal vendor={openVendor} onClose={() => setOpenVendor(null)} />
    </>
  );
}
