"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { enterSchoolCode, type EnterCodeState } from "./actions";

export function SchoolCodeForm() {
  const [state, formAction, pending] = useActionState<EnterCodeState, FormData>(
    enterSchoolCode,
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <Label htmlFor="code">Codice scuola</Label>
      <Input
        id="code"
        name="code"
        placeholder="Es. scuola-manzoni-8f3a1c2e"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
        required
        aria-invalid={!!state.error}
      />
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Verifica…" : "Apri calendario"}
      </Button>
    </form>
  );
}
