"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { login, type LoginState } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          // React azzera il form dopo l'invio: ripartiamo dall'email appena usata
          key={state.email}
          defaultValue={state.email}
          id="email"
          name="email"
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
          autoComplete="current-password"
          className="h-11 text-base"
          required
        />
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Accesso…" : "Accedi"}
      </Button>
    </form>
  );
}
