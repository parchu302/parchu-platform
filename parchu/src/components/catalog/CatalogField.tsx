type CatalogFieldProps = {
  id: string;
  name: string;
  label: string;
  type?: string;
  placeholder?: string;
  error?: string;
  as?: "input" | "textarea";
  inputMode?: "numeric" | "decimal";
};

const FIELD =
  "w-full rounded border-2 border-ink bg-paper px-3.5 py-3 text-[14.5px] text-ink placeholder:text-ink/40";
const LABEL =
  "mb-1.5 block text-[12.5px] font-bold uppercase tracking-[.08em] text-teal";

export function CatalogField({
  id,
  name,
  label,
  type = "text",
  placeholder,
  error,
  as = "input",
  inputMode,
}: CatalogFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label htmlFor={id} className={LABEL}>
        {label}
      </label>
      {as === "textarea" ? (
        <textarea
          id={id}
          name={name}
          rows={3}
          placeholder={placeholder}
          aria-describedby={error ? errorId : undefined}
          className={FIELD}
        />
      ) : (
        <input
          id={id}
          name={name}
          type={type}
          inputMode={inputMode}
          placeholder={placeholder}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={FIELD}
        />
      )}
      {error ? (
        <p id={errorId} data-field-error className="mt-1.5 text-[12.5px] text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export const CATALOG_FIELD_CLASS = FIELD;
export const CATALOG_LABEL_CLASS = LABEL;

export function CatalogMessage({
  status,
  message,
}: {
  status: "idle" | "error" | "success";
  message: string;
}) {
  if (status === "idle" || !message) return null;

  return (
    <p
      role="status"
      data-testid="catalog-message"
      className={`rounded border-2 px-3 py-2 text-[13.5px] font-semibold ${
        status === "error"
          ? "border-coral bg-coral/10 text-coral"
          : "border-teal bg-teal/10 text-teal"
      }`}
    >
      {message}
    </p>
  );
}

export const SUBMIT_CLASS =
  "mt-2 cursor-pointer justify-self-start rounded-[3px] border-2 border-ink bg-ink px-[26px] py-[15px] text-[15.5px] font-bold text-paper transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60";
