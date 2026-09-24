"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { inviteStaff } from "./actions";

export function InviteForm() {
  const [state, formAction, pending] = useActionState(inviteStaff, {});

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-[2fr_2fr_1fr_auto] sm:items-end">
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" placeholder="nome@esempio.it" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="full_name">Nome (facoltativo)</Label>
        <Input id="full_name" name="full_name" placeholder="Mario Rossi" maxLength={120} />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="role">Ruolo</Label>
        <NativeSelect id="role" name="role" defaultValue="instructor">
          <option value="instructor">Istruttore</option>
          <option value="master">Master</option>
        </NativeSelect>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "…" : "Abilita"}
      </Button>
      <div className="sm:col-span-4">
        <FormMessage state={state} />
      </div>
    </form>
  );
}
