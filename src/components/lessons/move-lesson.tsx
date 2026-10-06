"use client";

import { CalendarClock } from "lucide-react";
import { useState, useTransition } from "react";

import { moveLesson } from "@/app/(staff)/admin/calendario/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDay, formatTime } from "@/lib/dates";

export type MovableLesson = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  /** Es. "Scuola Manzoni · Classe 2A" */
  label: string;
};

function toMinutes(time: string) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function fromMinutes(total: number) {
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

/** Fine = nuovo inizio + durata della lezione (la durata non cambia). */
function endFor(lesson: MovableLesson, start: string) {
  if (!/^\d{2}:\d{2}$/.test(start)) return null;
  const duration = toMinutes(formatTime(lesson.end_time)) - toMinutes(formatTime(lesson.start_time));
  const end = toMinutes(start) + duration;
  return end < 24 * 60 ? fromMinutes(end) : null;
}

/**
 * Sposta una lezione a un'altra data e/o ora (solo master).
 * `proposal` precompila i campi (es. la proposta della maestra).
 */
export function MoveLessonForm({
  lesson,
  proposal,
  onCancel,
  onMoved,
}: {
  lesson: MovableLesson;
  proposal?: { date?: string | null; time?: string | null };
  onCancel: () => void;
  onMoved: (message: string) => void | Promise<void>;
}) {
  const [date, setDate] = useState(proposal?.date ?? lesson.date);
  const [start, setStart] = useState(proposal?.time ? formatTime(proposal.time) : formatTime(lesson.start_time));
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const end = endFor(lesson, start);
  const unchanged = date === lesson.date && start === formatTime(lesson.start_time);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    if (!end) return setError("La lezione deve finire entro la mezzanotte.");
    startTransition(async () => {
      const result = await moveLesson(lesson.id, date, start, end);
      if (result.error) setError(result.error);
      else await onMoved(`Lezione spostata a ${formatDay(date)}, ${start}.`);
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <DialogHeader>
        <DialogTitle>Sposta lezione</DialogTitle>
        <DialogDescription>{lesson.label}</DialogDescription>
      </DialogHeader>

      <p className="rounded-xl bg-muted px-3 py-2 text-sm">
        <span className="text-muted-foreground">Ora: </span>
        <span className="font-semibold first-letter:uppercase">
          {formatDay(lesson.date)}, {formatTime(lesson.start_time)}–{formatTime(lesson.end_time)}
        </span>
      </p>

      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 flex flex-col gap-2">
          <Label htmlFor="move-date">Nuova data</Label>
          <Input id="move-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="move-start">Inizio</Label>
          <Input
            id="move-start"
            type="time"
            step={300}
            value={start}
            onChange={(e) => setStart(e.target.value)}
            required
          />
        </div>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Fine</span>
          <p className="flex h-11 items-center text-base font-semibold tabular-nums">{end ?? "—"}</p>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>
          Annulla
        </Button>
        <Button type="submit" disabled={pending || unchanged || !date || !start}>
          {pending ? "Spostamento…" : "Sposta"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** Pulsante "Sposta" con il proprio dialog (richieste, dashboard). */
export function MoveLessonButton({
  lesson,
  proposal,
  onMoved,
  variant = "default",
}: {
  lesson: MovableLesson;
  proposal?: { date?: string | null; time?: string | null };
  /** Eseguita dopo lo spostamento (es. segna la richiesta come gestita). */
  onMoved?: () => Promise<unknown>;
  variant?: "default" | "outline";
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button type="button" variant={variant} onClick={() => setOpen(true)}>
        <CalendarClock aria-hidden /> Sposta
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          {open && (
            <MoveLessonForm
              lesson={lesson}
              proposal={proposal}
              onCancel={() => setOpen(false)}
              onMoved={async () => {
                await onMoved?.();
                setOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
