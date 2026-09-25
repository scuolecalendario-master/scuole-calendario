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

/** Menu dell'area riservata: voce attiva evidenziata, scorrevole su smartphone. */
export function StaffNav({ links }: { links: StaffLink[] }) {
  const pathname = usePathname();

  return (
    <nav className="-mx-1 flex gap-1 overflow-x-auto" aria-label="Menu">
      {links.map((l) => {
        const active = l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex min-h-11 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm font-semibold whitespace-nowrap transition-colors",
              active ? "bg-white text-primary" : "text-white hover:bg-white/15",
            )}
          >
            {l.label}
            {!!l.badge && (
              <span
                className="min-w-5 rounded-full bg-coral px-1.5 text-center text-xs leading-5 font-bold text-foreground"
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
