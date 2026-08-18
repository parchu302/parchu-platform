import Link from "next/link";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-1 flex-col justify-center px-6 py-16">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2.5 font-display text-[22px] tracking-[.5px] no-underline"
      >
        <span className="h-3 w-3 rounded-full bg-coral shadow-[0_2px_3px_rgba(0,0,0,.25)]" />
        ParchU
      </Link>
      <div className="rounded-lg border-2 border-ink bg-paper-2 p-8 shadow-[5px_7px_0_rgba(43,33,24,.18)]">
        {children}
      </div>
    </main>
  );
}
