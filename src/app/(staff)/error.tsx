"use client";

import { Button } from "@/components/ui/button";

export default function StaffError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-semibold">Qualcosa è andato storto</h1>
      <p className="text-sm text-muted-foreground">
        {/* In produzione il messaggio dei server error è generico: mostriamo il digest per il supporto */}
        {error.digest ? `Codice errore: ${error.digest}` : error.message}
      </p>
      <Button onClick={() => retry()}>Riprova</Button>
    </main>
  );
}
