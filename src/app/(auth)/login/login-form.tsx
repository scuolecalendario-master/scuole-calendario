"use client";

import { useActionState, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  login,
  sendLoginCode,
  verifyLoginCode,
  type CodeState,
  type LoginState,
} from "./actions";

function ErrorText({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-sm text-destructive" role="alert">
      {message}
    </p>
  );
}

export function LoginForm({ next }: { next?: string }) {
  const [mode, setMode] = useState<"code" | "password">("code");

  return (
    <div className="flex flex-col gap-4">
      {mode === "code" ? <CodeLogin next={next} /> : <PasswordLogin next={next} />}
      <button
        type="button"
        onClick={() => setMode(mode === "code" ? "password" : "code")}
        className="text-center text-sm text-muted-foreground underline underline-offset-4"
      >
        {mode === "code" ? "Accedi con password" : "Ricevi un codice via email"}
      </button>
    </div>
  );
}

/** Istruttori: codice monouso via email, comodo da smartphone. */
function CodeLogin({ next }: { next?: string }) {
  const [sendState, sendAction, sending] = useActionState<CodeState, FormData>(sendLoginCode, {});
  const [verifyState, verifyAction, verifying] = useActionState<CodeState, FormData>(
    verifyLoginCode,
    {},
  );

  if (!sendState.sentTo) {
    return (
      <form action={sendAction} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="otp-email">Email</Label>
          <Input
            id="otp-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            className="h-11 text-base"
            required
          />
        </div>
        <ErrorText message={sendState.error} />
        <Button type="submit" size="lg" className="h-11" disabled={sending}>
          {sending ? "Invio…" : "Ricevi codice via email"}
        </Button>
      </form>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form action={verifyAction} className="flex flex-col gap-4">
        <input type="hidden" name="email" value={sendState.sentTo} />
        <input type="hidden" name="next" value={next ?? ""} />
        <p className="text-sm text-muted-foreground">
          Abbiamo inviato un codice a <strong className="text-foreground">{sendState.sentTo}</strong>.
          Puoi inserirlo qui oppure aprire il link nell&apos;email.
        </p>
        <div className="flex flex-col gap-2">
          <Label htmlFor="otp-token">Codice</Label>
          <Input
            id="otp-token"
            name="token"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9 ]{6,12}"
            placeholder="123456"
            className="h-12 text-center font-mono text-2xl tracking-[0.3em]"
            autoFocus
            required
          />
        </div>
        <ErrorText message={verifyState.error} />
        <Button type="submit" size="lg" className="h-11" disabled={verifying}>
          {verifying ? "Verifica…" : "Accedi"}
        </Button>
      </form>
      <form action={sendAction}>
        <input type="hidden" name="email" value={sendState.sentTo} />
        <Button type="submit" variant="ghost" size="sm" className="w-full" disabled={sending}>
          {sending ? "Invio…" : "Invia di nuovo il codice"}
        </Button>
      </form>
    </div>
  );
}

/** Master: email e password. */
function PasswordLogin({ next }: { next?: string }) {
  const [state, formAction, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <ErrorText message={state.error} />
      <Button type="submit" disabled={pending}>
        {pending ? "Accesso…" : "Accedi"}
      </Button>
    </form>
  );
}
