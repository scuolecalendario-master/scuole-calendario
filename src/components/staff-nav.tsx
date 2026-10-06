"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { cn } from "@/lib/utils";

export type StaffLink = {
  href: string;
  label: string;
  /** Contatore rosso (es. richieste aperte); nascosto se 0. */
  badge?: number;
  /** Corrispondenza esatta del percorso (per le pagine "radice" come /admin). */
  exact?: boolean;
  /** Su smartphone sta sotto "Altro" (menu lunghi: niente righe di pulsanti sopra la pagina). */
  more?: boolean;
};

/**
 * Menu dell'area riservata. Su smartphone le voci stanno in una griglia (max 4
 * colonne), senza scorrimento orizzontale; quelle segnate `more` si aprono con
 * "Altro". Da tablet in su tutte le voci stanno su una riga.
 */
export function StaffNav({ links }: { links: StaffLink[] }) {
  const pathname = usePathname();
  const isActive = (l: StaffLink) =>
    l.exact ? pathname === l.href : pathname === l.href || pathname.startsWith(`${l.href}/`);
  const main = links.filter((l) => !l.more);
  const more = links.filter((l) => l.more);
  const [open, setOpen] = useState(false);
  // Pagina corrente sotto "Altro": il gruppo resta visibile
  const showMore = open || more.some(isActive);
  const moreBadge = more.reduce((sum, l) => sum + (l.badge ?? 0), 0);
  const cols = Math.min(main.length + (more.length ? 1 : 0), 4);

  return (
    <nav aria-label="Menu" className="flex flex-col gap-1 md:flex-row md:flex-wrap">
      <div className={cn("grid gap-1 md:contents", GRID[cols])}>
        {main.map((l) => (
          <NavLink key={l.href} link={l} active={isActive(l)} onClick={() => setOpen(false)} />
        ))}
        {more.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={showMore}
            className={cn(
              "relative flex min-h-11 items-center justify-center gap-1 rounded-xl px-1 text-[13px] font-semibold text-white hover:bg-white/15 md:hidden",
              showMore && "bg-white/15",
            )}
          >
            Altro
            <ChevronDown className={cn("size-4 transition-transform", showMore && "rotate-180")} aria-hidden />
            {!!moreBadge && !showMore && <Badge count={moreBadge} />}
          </button>
        )}
      </div>
      {more.length > 0 && (
        <div className={cn("grid-cols-3 gap-1 md:contents", showMore ? "grid" : "hidden")}>
          {more.map((l) => (
            <NavLink key={l.href} link={l} active={isActive(l)} onClick={() => setOpen(false)} />
          ))}
        </div>
      )}
    </nav>
  );
}

const GRID: Record<number, string> = { 1: "grid-cols-1", 2: "grid-cols-2", 3: "grid-cols-3", 4: "grid-cols-4" };

function NavLink({ link: l, active, onClick }: { link: StaffLink; active: boolean; onClick: () => void }) {
  return (
    <Link
      href={l.href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex min-h-11 min-w-0 items-center justify-center rounded-xl px-1 text-center text-[13px] leading-tight font-semibold transition-colors md:px-3 md:text-sm",
        active ? "bg-white text-primary" : "text-white hover:bg-white/15",
      )}
    >
      {l.label}
      {!!l.badge && <Badge count={l.badge} />}
    </Link>
  );
}

function Badge({ count }: { count: number }) {
  return (
    <span
      className="absolute -top-1 -right-0.5 min-w-5 rounded-full bg-coral px-1 text-center text-xs leading-5 font-bold text-foreground md:static md:ml-1.5"
      aria-label={`${count} da gestire`}
    >
      {count}
    </span>
  );
}
