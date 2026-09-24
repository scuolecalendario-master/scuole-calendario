"use client";

import { useState, useTransition } from "react";

import { CopyButton } from "@/components/copy-button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { resetPassword } from "./actions";

/** Conferma → genera password temporanea → la mostra una sola volta. */
export function ResetPasswordButton({ profileId, name }: { profileId: string; name: string }) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState<{ error?: string; password?: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (!next) setResult(null); // la password non resta in memoria dopo la chiusura
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger render={<Button variant="outline" size="sm" />}>
        Reimposta password
      </AlertDialogTrigger>
      <AlertDialogContent>
        {result?.password ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Password temporanea per {name}</AlertDialogTitle>
              <AlertDialogDescription>
                Consegnala all&apos;istruttore: al primo accesso dovrà sceglierne una nuova. Non sarà
                più visibile dopo aver chiuso questa finestra.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <p className="rounded-lg bg-muted py-3 text-center font-mono text-2xl font-semibold tracking-wider">
              {result.password}
            </p>
            <AlertDialogFooter>
              <CopyButton text={result.password} label="Copia password" />
              <AlertDialogCancel>Chiudi</AlertDialogCancel>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>Reimpostare la password di {name}?</AlertDialogTitle>
              <AlertDialogDescription>
                La password attuale smetterà di funzionare. Verrà generata una password temporanea
                da consegnare all&apos;istruttore.
              </AlertDialogDescription>
            </AlertDialogHeader>
            {result?.error && (
              <p className="text-sm text-destructive" role="alert">
                {result.error}
              </p>
            )}
            <AlertDialogFooter>
              <AlertDialogCancel disabled={pending}>Annulla</AlertDialogCancel>
              <Button
                disabled={pending}
                onClick={() => startTransition(async () => setResult(await resetPassword(profileId)))}
              >
                {pending ? "Attendere…" : "Reimposta"}
              </Button>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
