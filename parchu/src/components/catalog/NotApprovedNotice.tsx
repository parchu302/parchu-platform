export function NotApprovedNotice({ what }: { what: string }) {
  return (
    <div
      role="alert"
      data-testid="not-approved-notice"
      className="rounded-lg border-2 border-mustard bg-mustard/15 p-8"
    >
      <h2 className="mb-2 font-display text-[20px]">
        Ese emprendimiento aún no ha sido aprobado
      </h2>
      <p className="text-[14.5px] text-ink/80">
        Cuando el equipo de ParchU lo apruebe podrás registrar {what}.
      </p>
    </div>
  );
}
