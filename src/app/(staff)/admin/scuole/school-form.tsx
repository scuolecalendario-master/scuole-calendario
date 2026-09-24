"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ActionState } from "@/lib/forms";

export function SchoolForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  defaults?: { name: string; contact_email: string | null };
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[2fr_2fr_auto] sm:items-end">
      <div className="flex flex-col gap-2">
        <Label htmlFor="name">Nome scuola</Label>
        <Input
          id="name"
          name="name"
          defaultValue={defaults?.name}
          placeholder="Es. Scuola Primaria Manzoni"
          maxLength={120}
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="contact_email">Email di contatto</Label>
        <Input
          id="contact_email"
          name="contact_email"
          type="email"
          defaultValue={defaults?.contact_email ?? ""}
          placeholder="segreteria@scuola.it"
        />
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Salvataggio…" : submitLabel}
      </Button>
      <div className="sm:col-span-3">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
