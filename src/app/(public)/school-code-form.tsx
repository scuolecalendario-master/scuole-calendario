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
        placeholder="Es. 3F9A1C7B2D4E6F80"
        autoComplete="off"
        autoCapitalize="characters"
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
