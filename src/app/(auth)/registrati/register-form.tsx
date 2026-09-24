"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register, type RegisterState } from "./actions";

export function RegisterForm({ code }: { code?: string }) {
  const [state, formAction, pending] = useActionState<RegisterState, FormData>(register, {});
  // Dopo un errore React azzera il form: i campi ripartono dai valori inviati
  const v = state.values;

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="code">Codice di registrazione</Label>
        <Input
          id="code"
          name="code"
          key={v?.code}
          defaultValue={v?.code ?? code}
          placeholder="ISTR-XXXX-XXXX"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="h-11 font-mono text-base uppercase"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Nome e cognome</Label>
        <Input
          id="full_name"
          name="full_name"
          key={v?.full_name}
          defaultValue={v?.full_name}
          autoComplete="name"
          maxLength={120}
          className="h-11 text-base"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          key={v?.email}
          defaultValue={v?.email}
          type="email"
          autoComplete="email"
          inputMode="email"
          className="h-11 text-base"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="h-11 text-base"
          required
        />
        <p className="text-xs text-muted-foreground">Almeno 8 caratteri.</p>
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Registrazione…" : "Registrati"}
      </Button>
    </form>
  );
}
