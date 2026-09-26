"use client";

import { HomeLogo } from "@/components/brand";
import { Button } from "@/components/ui/button";

/** Problema momentaneo (connessione, database): mai "codice non valido". */
export default function PublicError({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-10 text-center">
      <HomeLogo href="/" />
      <h1 className="text-2xl font-bold">La pagina non si è caricata</h1>
      <p className="text-base text-muted-foreground">
        È un problema momentaneo: il tuo link è giusto. Controlla la connessione e riprova.
      </p>
      <Button size="lg" className="min-h-11 px-6 text-base" onClick={() => retry()}>
        Riprova
      </Button>
    </main>
  );
}
