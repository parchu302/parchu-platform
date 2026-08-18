"use client";

import { useActionState } from "react";

import { registerProductAction } from "@/actions/catalog/register-product";
import { initialCatalogFormState } from "@/actions/catalog/types";
import { PRODUCT_CATEGORIES } from "@/lib/categories";

import {
  CATALOG_FIELD_CLASS,
  CATALOG_LABEL_CLASS,
  CatalogField,
  CatalogMessage,
  SUBMIT_CLASS,
} from "./CatalogField";

export function ProductForm({ businessId }: { businessId: string }) {
  const [state, formAction, pending] = useActionState(
    registerProductAction,
    initialCatalogFormState,
  );

  return (
    <form action={formAction} className="grid gap-4">
      <input type="hidden" name="businessId" value={businessId} />

      <CatalogField
        id="product-name"
        name="name"
        label="Nombre"
        placeholder="Brownie"
        error={state.errors?.name?.[0]}
      />
      <CatalogField
        id="product-description"
        name="description"
        label="Descripción (opcional)"
        as="textarea"
        placeholder="Con nueces, por encargo"
        error={state.errors?.description?.[0]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <CatalogField
          id="product-price"
          name="price"
          label="Precio"
          inputMode="decimal"
          placeholder="6000"
          error={state.errors?.price?.[0]}
        />
        <CatalogField
          id="product-stock"
          name="stock"
          label="Stock"
          inputMode="numeric"
          placeholder="10"
          error={state.errors?.stock?.[0]}
        />
      </div>

      <div>
        <label className={CATALOG_LABEL_CLASS} htmlFor="product-category">
          Categoría
        </label>
        <select
          id="product-category"
          name="category"
          defaultValue=""
          className={CATALOG_FIELD_CLASS}
        >
          <option value="">Selecciona una categoría</option>
          {PRODUCT_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        {state.errors?.category ? (
          <p
            id="product-category-error"
            data-field-error
            className="mt-1.5 text-[12.5px] text-coral"
          >
            {state.errors.category[0]}
          </p>
        ) : null}
      </div>

      <CatalogMessage status={state.status} message={state.message} />

      <button type="submit" disabled={pending} className={SUBMIT_CLASS}>
        {pending ? "Publicando..." : "Publicar producto"}
      </button>
    </form>
  );
}
