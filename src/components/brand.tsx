import Image from "next/image";
import Link from "next/link";

import { cn } from "@/lib/utils";

export const APP_NAME = "AquaClass Connect";

/**
 * Emblema (scuola, nuotatore e onde). WebP leggeri in public/brand ricavati dal
 * logo originale: 128 px per le misure piccole, 384 px per quelle grandi.
 */
export function BrandMark({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <Image
      src={size <= 64 ? "/brand/aquaclass-mark-128.webp" : "/brand/aquaclass-mark-384.webp"}
      alt=""
      width={size}
      height={size}
      unoptimized
      priority
      className={cn("shrink-0", className)}
    />
  );
}

/** Scritta "AquaClass Connect" in HTML (colori con contrasto verificato, DESIGN.md §3). */
export function Wordmark({ onDark = false, className }: { onDark?: boolean; className?: string }) {
  return (
    <span className={cn("leading-tight whitespace-nowrap", className)}>
      <span className={cn("font-extrabold", onDark ? "text-white" : "text-[#0A2540]")}>AquaClass</span>{" "}
      <span className={cn("font-normal", onDark ? "text-[#A5F3FC]" : "text-[#0060D6]")}>Connect</span>
    </span>
  );
}

/**
 * Logo cliccabile = tasto Home. Su sfondo blu l'emblema sta in un cerchio bianco
 * per restare leggibile.
 */
export function HomeLogo({
  href,
  onDark = false,
  subtitle,
  className,
}: {
  href: string;
  onDark?: boolean;
  /** Seconda riga piccola (es. "Amministrazione"). */
  subtitle?: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      aria-label={`${APP_NAME}: torna alla pagina iniziale`}
      className={cn("flex min-h-11 min-w-0 items-center gap-2 rounded-2xl pr-1 sm:gap-2.5", className)}
    >
      <span className={cn("flex items-center justify-center rounded-full", onDark && "bg-white p-0.5")}>
        <BrandMark size={onDark ? 40 : 44} />
      </span>
      <span className="flex min-w-0 flex-col">
        <Wordmark onDark={onDark} className="text-base sm:text-lg" />
        {subtitle && (
          <span className={cn("text-xs font-semibold", onDark ? "text-white/85" : "text-muted-foreground")}>
            {subtitle}
          </span>
        )}
      </span>
    </Link>
  );
}

/** Logo grande centrato (home, login, registrazione): anche questo porta alla Home. */
export function BrandHeader({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${APP_NAME}: pagina iniziale`}
      className={cn("flex flex-col items-center gap-2 text-center", className)}
    >
      <BrandMark size={96} />
      <Wordmark className="text-2xl" />
    </Link>
  );
}
