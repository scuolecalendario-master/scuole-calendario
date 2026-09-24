"use client";

import { useActionState } from "react";

import { CopyButton, useOrigin } from "@/components/copy-button";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createRegistrationCode, type CreateCodeState } from "./actions";

export function CodeForm() {
  const [state, formAction, pending] = useActionState<CreateCodeState, FormData>(
    createRegistrationCode,
    {},
  );
  const origin = useOrigin();

  const link = state.code ? `${origin}/registrati?codice=${state.code}` : "";
  const message = state.code
    ? `Ciao${state.label ? ` ${state.label}` : ""}, registrati al calendario lezioni qui: ${link}\n` +
      `Codice di registrazione: ${state.code} (valido una sola volta).`
    : "";

  return (
    <div className="flex flex-col gap-4">
      <form action={formAction} className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="label">Nome istruttore (facoltativo)</Label>
          <Input id="label" name="label" placeholder="Es. Mario Rossi" maxLength={120} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="role">Ruolo</Label>
          <NativeSelect id="role" name="role" defaultValue="instructor">
            <option value="instructor">Istruttore</option>
            <option value="master">Master</option>
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="days">Valido per</Label>
          <NativeSelect id="days" name="days" defaultValue="14">
            <option value="7">7 giorni</option>
            <option value="14">14 giorni</option>
            <option value="30">30 giorni</option>
          </NativeSelect>
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Genera codice"}
        </Button>
      </form>

      {state.error && <FormMessage state={state} />}

      {state.code && (
        <div className="flex flex-col gap-3 rounded-lg border border-primary/40 bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">
            Codice creato{state.label ? ` per ${state.label}` : ""}. Consegnalo all&apos;istruttore:
          </p>
          <p className="font-mono text-2xl font-semibold tracking-wider">{state.code}</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={state.code} label="Copia codice" />
            <CopyButton text={link} label="Copia link di registrazione" />
            <CopyButton text={message} label="Copia messaggio (WhatsApp/SMS)" variant="default" />
          </div>
        </div>
      )}
    </div>
  );
}
