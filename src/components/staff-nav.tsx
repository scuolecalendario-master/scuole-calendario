"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

export type StaffLink = {
  href: string;
  label: string;
  /** Contatore rosso (es. richieste aperte); nascosto se 0. */
  badge?: number;
  /** Corrispondenza esatta del percorso (per le pagine "radice" come /admin). */
  exact?: boolean;
};

/**
 * Menu dell'area riservata. Su smartphone tutte le voci sono sempre visibili in
 * una griglia (max 4 colonne), senza scorrimento orizzontale; da tablet in su
 * stanno su una riga.
 */
export function StaffNav({ links }: { links: StaffLink[] }) {
  const pathname = usePathname();
  const cols = Math.min(links.length, 4);

  return (
    <nav
      aria-label="Menu"
      className={cn(
        "grid gap-1 md:flex md:flex-wrap",
        cols === 2 && "grid-cols-2",
        cols === 3 && "grid-cols-3",
        cols === 4 && "grid-cols-4",
      )}
    >
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 min-w-0 items-center justify-center rounded-xl px-1 text-[13px] font-semibold transition-colors md:px-3 md:text-sm",
              active ? "bg-white text-primary" : "text-white hover:bg-white/15",
            )}
          >
            <span className="truncate">{l.label}</span>
            {!!l.badge && (
              <span
                className="absolute -top-1 -right-0.5 min-w-5 rounded-full bg-coral px-1 text-center text-xs leading-5 font-bold text-foreground md:static md:ml-1.5"
                aria-label={`${l.badge} da gestire`}
              >
                {l.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
