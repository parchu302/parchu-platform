type AuthFieldProps = {
  id: string;
  name: string;
  label: string;
  type?: string;
  autoComplete?: string;
  placeholder?: string;
  error?: string;
};

export function AuthField({
  id,
  name,
  label,
  type = "text",
  autoComplete,
  placeholder,
  error,
}: AuthFieldProps) {
  const errorId = `${id}-error`;

  return (
    <div>
      <label
        htmlFor={id}
        className="mb-1.5 block text-[12.5px] font-bold uppercase tracking-[.08em] text-teal"
      >
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="w-full rounded border-2 border-ink bg-paper px-3.5 py-3 text-[14.5px] text-ink placeholder:text-ink/40"
      />
      {error ? (
        <p id={errorId} data-field-error className="mt-1.5 text-[12.5px] text-coral">
          {error}
        </p>
      ) : null}
    </div>
  );
}
