"use client";

import { useTransition } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/** Pulsante che chiede conferma prima di eseguire una Server Action. */
export function ConfirmAction({
  action,
  trigger,
  title,
  description,
  confirmLabel = "Conferma",
  destructive = true,
  size = "sm",
}: {
  action: () => Promise<unknown>;
  trigger: string;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  destructive?: boolean;
  size?: "sm" | "default";
}) {
  const [pending, startTransition] = useTransition();

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button variant={destructive ? "destructive" : "outline"} size={size} disabled={pending} />
        }
      >
        {pending ? "Attendere…" : trigger}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annulla</AlertDialogCancel>
          <AlertDialogAction
            variant={destructive ? "destructive" : "default"}
            onClick={() => startTransition(async () => void (await action()))}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
