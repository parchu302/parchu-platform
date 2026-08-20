"use client";

import { useActionState, useState, type ChangeEvent, type FormEvent } from "react";

import { registerProductAction } from "@/actions/catalog/register-product";
import { initialCatalogFormState } from "@/actions/catalog/types";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import { compressImageToDataUrl } from "@/lib/client/compress-image";

import {
  CATALOG_FIELD_CLASS,
  CATALOG_LABEL_CLASS,
  CatalogField,
  CatalogMessage,
  SUBMIT_CLASS,
} from "./CatalogField";

const IMAGE_TYPE_ERROR = "El archivo debe ser una imagen válida (JPG, PNG o WEBP)";
const IMAGE_PROCESSING_ERROR =
  "No se pudo procesar la imagen. Intenta con otro archivo.";

export function ProductForm({ businessId }: { businessId: string }) {
  const [state, formAction, pending] = useActionState(
    registerProductAction,
    initialCatalogFormState,
  );
  const [imageDataUrl, setImageDataUrl] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | undefined>();
  const [imageProcessing, setImageProcessing] = useState(false);
  const imageErrorMessage = imageError ?? state.errors?.image?.[0];

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      setImageDataUrl("");
      setImagePreview(null);
      setImageError(undefined);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setImageError(IMAGE_TYPE_ERROR);
      setImageDataUrl("");
      setImagePreview(null);
      return;
    }

    setImageError(undefined);
    setImageProcessing(true);

    try {
      const dataUrl = await compressImageToDataUrl(file);
      setImageDataUrl(dataUrl);
      setImagePreview(dataUrl);
    } catch {
      setImageError(IMAGE_PROCESSING_ERROR);
      setImageDataUrl("");
      setImagePreview(null);
    } finally {
      setImageProcessing(false);
    }
  }

  // La imagen invalida se rechaza en el cliente sin llegar a invocar la
  // Server Action: asi "el producto no se crea" queda garantizado sin
  // depender de un roundtrip al servidor.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (imageError) {
      event.preventDefault();
    }
  }

  return (
    <form action={formAction} onSubmit={handleSubmit} className="grid gap-4">
      <input type="hidden" name="businessId" value={businessId} />
      <input type="hidden" name="image" value={imageDataUrl} />

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

      <div>
        <label className={CATALOG_LABEL_CLASS} htmlFor="product-image">
          Imagen (opcional)
        </label>
        <input
          id="product-image"
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          aria-describedby={imageErrorMessage ? "product-image-error" : undefined}
          className={CATALOG_FIELD_CLASS}
        />
        {imageProcessing ? (
          <p className="mt-1.5 text-[12.5px] text-ink/60">
            Procesando imagen...
          </p>
        ) : null}
        {imagePreview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt="Vista previa del producto"
            className="mt-2 h-24 w-24 rounded border-2 border-ink object-cover"
          />
        ) : null}
        {imageErrorMessage ? (
          <p
            id="product-image-error"
            data-field-error
            className="mt-1.5 text-[12.5px] text-coral"
          >
            {imageErrorMessage}
          </p>
        ) : null}
      </div>

      <CatalogMessage status={state.status} message={state.message} />

      <button
        type="submit"
        disabled={pending || imageProcessing}
        className={SUBMIT_CLASS}
      >
        {pending ? "Publicando..." : "Publicar producto"}
      </button>
    </form>
  );
}
