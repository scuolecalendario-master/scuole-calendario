"use client";

import { ConfirmAction } from "@/components/confirm-action";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ActionState } from "@/lib/forms";
import { useFormAction } from "@/lib/use-form-action";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

/** Intestazione di un plesso: nome modificabile ed eliminazione. */
export function SiteHeader({
  name,
  classCount,
  renameAction,
  deleteAction,
}: {
  name: string;
  classCount: number;
  renameAction: FormAction;
  deleteAction: () => Promise<void>;
}) {
  const { state, pending, onSubmit } = useFormAction(renameAction);

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        key={name}
        name="name"
        defaultValue={name}
        aria-label="Nome del plesso"
        maxLength={120}
        required
        className="h-11 max-w-sm flex-1 text-lg font-semibold"
      />
      <Button type="submit" variant="outline" disabled={pending}>
        Rinomina
      </Button>
      <ConfirmAction
        action={deleteAction}
        trigger="Elimina plesso"
        title={`Eliminare il plesso ${name}?`}
        description={
          classCount > 0
            ? `Le sue ${classCount} classi restano nell'istituto, senza plesso. Lezioni e presenze non vengono toccate.`
            : "Il plesso non ha classi."
        }
        confirmLabel="Elimina plesso"
      />
      <FormMessage state={state} />
    </form>
  );
}

export function NewSiteForm({ action }: { action: FormAction }) {
  const { state, pending, onSubmit } = useFormAction(action, { resetOnSuccess: true });

  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-center gap-2">
      <Input
        name="name"
        placeholder="Nuovo plesso, es. Primaria Rodari"
        aria-label="Nome del nuovo plesso"
        maxLength={120}
        required
        className="h-11 max-w-sm flex-1"
      />
      <Button type="submit" disabled={pending}>
        + Plesso
      </Button>
      <FormMessage state={state} />
    </form>
  );
}
