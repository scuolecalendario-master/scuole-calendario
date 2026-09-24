import Link from "next/link";

import { logout } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";

export function StaffHeader({
  title,
  links,
  userLabel,
}: {
  title: string;
  links: { href: string; label: string }[];
  userLabel: string;
}) {
  return (
    <header className="border-b">
      <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <span className="font-semibold">{title}</span>
        <nav className="flex gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-sm text-muted-foreground sm:inline">{userLabel}</span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Esci
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
