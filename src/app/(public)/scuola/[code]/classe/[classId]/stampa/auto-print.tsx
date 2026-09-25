"use client";

import { Printer } from "lucide-react";
import { useEffect } from "react";

/** Apre la finestra di stampa all'arrivo sulla pagina; il pulsante serve per ristampare. */
export function AutoPrint() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground print:hidden"
    >
      <Printer className="size-5" aria-hidden />
      Stampa
    </button>
  );
}
