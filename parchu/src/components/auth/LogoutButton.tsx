import { logoutAction } from "@/actions/auth/logout";

export function LogoutButton() {
  return (
    <form action={logoutAction}>
      <button
        type="submit"
        className="cursor-pointer rounded border-2 border-ink bg-paper px-4 py-2 text-[13px] font-bold uppercase tracking-[.06em]"
      >
        Cerrar sesión
      </button>
    </form>
  );
}
