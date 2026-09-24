"use client";

import { useActionState } from "react";

import { ConfirmAction } from "@/components/confirm-action";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/forms";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Riga modificabile di una classe esistente. */
export function ClassRow({
  gradeName,
  totalEnrolled,
  lessonsCount,
  updateAction,
  deleteAction,
}: {
  gradeName: string;
  totalEnrolled: number;
  lessonsCount: number;
  updateAction: FormAction;
  deleteAction: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(updateAction, {});

  return (
    <li className="rounded-lg border p-3">
      <form action={formAction} className="flex flex-wrap items-end gap-2">
        <div className="flex min-w-24 flex-1 flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Classe</Label>
          <Input name="grade_name" defaultValue={gradeName} maxLength={40} required />
        </div>
        <div className="flex w-24 flex-col gap-1">
          <Label className="text-xs text-muted-foreground">Iscritti</Label>
          <Input
            name="total_enrolled"
            type="number"
            inputMode="numeric"
            min={0}
            max={200}
            defaultValue={totalEnrolled}
            required
          />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending}>
          {pending ? "…" : "Salva"}
        </Button>
        <ConfirmAction
          action={deleteAction}
          trigger="Elimina"
          title={`Eliminare la classe ${gradeName}?`}
          description={
            lessonsCount > 0
              ? `Verranno eliminate anche le sue ${lessonsCount} lezioni, con stato e presenze registrate. L'operazione non è reversibile.`
              : "La classe non ha lezioni. L'operazione non è reversibile."
          }
          confirmLabel="Elimina classe"
        />
      </form>
      <div className="mt-1 flex justify-between gap-2 text-xs text-muted-foreground">
        <FormMessage state={state} />
        <span className="ml-auto">{lessonsCount} lezioni</span>
      </div>
    </li>
  );
}

export function NewClassForm({ action }: { action: FormAction }) {
  // React 19 svuota i campi del form dopo l'invio.
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex min-w-24 flex-1 flex-col gap-1">
        <Label htmlFor="new-grade">Nuova classe</Label>
        <Input id="new-grade" name="grade_name" placeholder="Es. 3A" maxLength={40} required />
      </div>
      <div className="flex w-24 flex-col gap-1">
        <Label htmlFor="new-enrolled">Iscritti</Label>
        <Input
          id="new-enrolled"
          name="total_enrolled"
          type="number"
          inputMode="numeric"
          min={0}
          max={200}
          defaultValue={0}
          required
        />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "…" : "Aggiungi"}
      </Button>
      <div className="w-full">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
