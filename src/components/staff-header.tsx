import { KeyRound, LogOut } from "lucide-react";
import Link from "next/link";

import { logout } from "@/app/(auth)/login/actions";
import { HomeLogo } from "@/components/brand";
import { StaffNav, type StaffLink } from "@/components/staff-nav";

export function StaffHeader({
  title,
  homeHref,
  links,
  userLabel,
  actions,
}: {
  /** Area (es. "Amministrazione"): sotto il logo. */
  title: string;
  /** Pagina iniziale dell'area: il logo è il tasto Home. */
  homeHref: string;
  links: StaffLink[];
  userLabel: string;
  /** Elementi extra a destra (es. campanella notifiche). */
  actions?: React.ReactNode;
}) {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <HomeLogo href={homeHref} onDark subtitle={title} />
          <div className="ml-auto flex shrink-0 items-center">
            {actions}
            <span className="hidden px-2 text-sm text-white/85 sm:inline">{userLabel}</span>
            <Link
              href="/password"
              aria-label="Cambia password"
              className="flex min-h-11 min-w-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium hover:bg-white/15 sm:px-3"
            >
              <KeyRound className="size-5 sm:hidden" aria-hidden />
              <span className="hidden sm:inline">Password</span>
            </Link>
            <form action={logout}>
              <button
                type="submit"
                aria-label="Esci"
                className="flex min-h-11 min-w-11 items-center justify-center rounded-xl px-2 text-sm font-medium hover:bg-white/15 sm:px-3"
              >
                <LogOut className="size-5 sm:hidden" aria-hidden />
                <span className="hidden sm:inline">Esci</span>
              </button>
            </form>
          </div>
        </div>
        <StaffNav links={links} />
      </div>
    </header>
  );
}
