import Link from "next/link";

import { logout } from "@/app/(auth)/login/actions";
import { StaffNav, type StaffLink } from "@/components/staff-nav";

export function StaffHeader({
  title,
  links,
  userLabel,
  actions,
}: {
  title: string;
  links: StaffLink[];
  userLabel: string;
  /** Elementi extra a destra (es. campanella notifiche). */
  actions?: React.ReactNode;
}) {
  return (
    <header className="bg-primary text-primary-foreground">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold">{title}</span>
          <div className="ml-auto flex items-center gap-1">
            {actions}
            <span className="hidden px-2 text-sm text-white/85 sm:inline">{userLabel}</span>
            <Link
              href="/password"
              className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium hover:bg-white/15"
            >
              Password
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="flex min-h-11 items-center rounded-xl px-3 text-sm font-medium hover:bg-white/15"
              >
                Esci
              </button>
            </form>
          </div>
        </div>
        <StaffNav links={links} />
      </div>
    </header>
  );
}
