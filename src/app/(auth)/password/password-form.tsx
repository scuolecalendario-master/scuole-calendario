"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changePassword } from "./actions";

export function PasswordForm({ temporary }: { temporary: boolean }) {
  const [state, formAction, pending] = useActionState(changePassword, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="current">{temporary ? "Password temporanea" : "Password attuale"}</Label>
        <Input
          id="current"
          name="current"
          type="password"
          autoComplete="current-password"
          className="h-11 text-base"
          required
        />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Nuova password</Label>
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
      <div className="flex flex-col gap-2">
        <Label htmlFor="confirm">Ripeti la nuova password</Label>
        <Input
          id="confirm"
          name="confirm"
          type="password"
          autoComplete="new-password"
          minLength={8}
          className="h-11 text-base"
          required
        />
      </div>
      <FormMessage state={state} />
      <Button type="submit" size="lg" className="h-11" disabled={pending}>
        {pending ? "Salvataggio…" : "Salva nuova password"}
      </Button>
    </form>
  );
}
