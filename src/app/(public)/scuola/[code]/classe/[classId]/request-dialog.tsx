"use client";

import { CalendarClock, CheckCircle2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useFormAction } from "@/lib/use-form-action";
import { cn } from "@/lib/utils";
import { requestChange } from "../../actions";

const NAME_KEY = "maestra:nome";

function savedName() {
  try {
    return localStorage.getItem(NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Pulsante + dialog per chiedere lo spostamento di una lezione. */
export function RequestChangeButton({
  code,
  lesson,
  variant,
}: {
  code: string;
  lesson: { id: string; label: string };
  /** onColor: sul riquadro colorato "Prossima lezione"; compact: nelle righe dell'elenco. */
  variant: "onColor" | "compact";
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const { state, pending, onSubmit } = useFormAction(requestChange.bind(null, code, lesson.id));
  const sent = !!state.success;

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) setName(savedName());
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <button
            type="button"
            className={cn(
              "flex min-h-11 shrink-0 items-center gap-2 rounded-xl font-semibold",
              variant === "onColor"
                ? "bg-white px-4 text-foreground"
                : "border-2 border-border px-3 text-sm text-primary",
            )}
          />
        }
      >
        <CalendarClock className="size-5" aria-hidden />
        {variant === "onColor" ? "Chiedi uno spostamento" : "Sposta?"}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        {sent ? (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle2 className="size-12 text-done" aria-hidden />
            <DialogTitle>Richiesta inviata</DialogTitle>
            <DialogDescription>
              L&apos;organizzazione ha ricevuto la richiesta e ti ricontatterà. Se la lezione viene spostata la
              vedrai aggiornata qui.
            </DialogDescription>
            <Button onClick={() => setOpen(false)} className="mt-2 h-11 px-6">
              Chiudi
            </Button>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              try {
                localStorage.setItem(NAME_KEY, name);
              } catch {}
              onSubmit(e);
            }}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Chiedi uno spostamento</DialogTitle>
              <DialogDescription>Lezione di {lesson.label}</DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`msg-${lesson.id}`}>Cosa è successo?</Label>
              <Textarea
                id={`msg-${lesson.id}`}
                name="message"
                rows={3}
                minLength={3}
                maxLength={500}
                required
                placeholder="Es. quel giorno c'è la gita, possiamo spostarla?"
                className="text-base"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor={`name-${lesson.id}`}>Il tuo nome</Label>
              <Input
                id={`name-${lesson.id}`}
                name="teacher_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                minLength={2}
                maxLength={80}
                required
                className="h-11 text-base"
              />
            </div>
            <fieldset className="grid grid-cols-2 gap-2">
              <legend className="mb-2 text-sm font-medium">
                Proposta <span className="text-muted-foreground">(facoltativa)</span>
              </legend>
              <Input name="proposed_date" type="date" aria-label="Data proposta" className="h-11 text-base" />
              <Input name="proposed_time" type="time" step={300} aria-label="Ora proposta" className="h-11 text-base" />
            </fieldset>
            {state.error && (
              <p className="text-sm font-medium text-cancelled-text" role="alert">
                {state.error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="h-11">
                Annulla
              </Button>
              <Button type="submit" disabled={pending} className="h-11">
                {pending ? "Invio…" : "Invia richiesta"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
