"use client";

import { useState, useTransition } from "react";

import type { ActionState } from "@/lib/forms";

/**
 * Invia un form a una Server Action SENZA l'azzeramento automatico di React 19:
 * in caso di errore i campi restano come li ha scritti l'utente (DESIGN.md §7).
 * Con `resetOnSuccess` il form si svuota solo se il salvataggio riesce.
 */
export function useFormAction(
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>,
  { resetOnSuccess = false }: { resetOnSuccess?: boolean } = {},
) {
  const [state, setState] = useState<ActionState>({});
  const [pending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    startTransition(async () => {
      const result = await action(state, data);
      setState(result);
      if (resetOnSuccess && !result.error) form.reset();
    });
  }

  return { state, pending, onSubmit };
}
