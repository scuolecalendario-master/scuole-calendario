"use client";

import { Check, Minus, Plus } from "lucide-react";
import { useState, useTransition } from "react";

import { StatusBadge, type LessonStatus } from "@/components/lessons/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LEVEL_STYLE } from "@/lib/colors";
import { formatDay, formatTime } from "@/lib/dates";
import { focusCatalog, focusLabel, LEVEL_LABEL, MAX_FOCUS, type SchoolLevel } from "@/lib/focus";
import { cn } from "@/lib/utils";
import { recordLesson } from "./actions";

export type AttendanceLesson = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: LessonStatus;
  attendees_count: number | null;
  focus: string[];
  focus_note: string | null;
  schoolName: string;
  gradeName: string;
  level: SchoolLevel;
  enrolled: number;
  instructorName: string | null;
  /** L'utente è tra gli istruttori della classe (o assegnato alla lezione). */
  canEdit: boolean;
};

export function AttendanceCard({
  lesson,
  isFuture,
  showDate = false,
}: {
  lesson: AttendanceLesson;
  /** Lezione futura: non si può ancora segnare come svolta. */
  isFuture: boolean;
  /** Mostra la data (sezione "Da registrare", giorni passati). */
  showDate?: boolean;
}) {
  const done = lesson.status === "done";
  const cancelled = lesson.status === "cancelled";
  const editable = lesson.canEdit && !cancelled && !isFuture;

  const [editing, setEditing] = useState(editable && !done);
  const [count, setCount] = useState(lesson.attendees_count ?? lesson.enrolled);
  const [focus, setFocus] = useState<string[]>(lesson.focus);
  const [note, setNote] = useState(lesson.focus_note ?? "");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const catalog = focusCatalog(lesson.level);
  const needsNote = focus.some((id) => catalog.find((f) => f.id === id)?.withNote);
  const setCountSafe = (n: number) => setCount(Math.max(0, Math.min(lesson.enrolled, n)));

  function toggleFocus(id: string) {
    setFocus((f) => (f.includes(id) ? f.filter((x) => x !== id) : f.length < MAX_FOCUS ? [...f, id] : f));
  }

  function save(isDone: boolean) {
    setError(undefined);
    startTransition(async () => {
      const result = await recordLesson(lesson.id, {
        done: isDone,
        attendeesCount: isDone ? count : null,
        focus: isDone ? focus : [],
        focusNote: isDone && needsNote ? note : null,
      });
      if (result.error) setError(result.error);
      else setEditing(!isDone);
    });
  }

  return (
    <li className={cn("rounded-2xl border-2 bg-card p-4", cancelled && "opacity-70", done && "border-done/40")}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showDate && <p className="text-sm font-semibold first-letter:uppercase text-primary">{formatDay(lesson.date)}</p>}
          <p className="text-2xl font-bold tabular-nums">
            {formatTime(lesson.start_time)}–{formatTime(lesson.end_time)}
          </p>
          <p className="text-lg font-semibold">
            Classe {lesson.gradeName}{" "}
            <span
              className={cn(
                "ml-1 inline-block rounded-full px-2 py-0.5 align-middle text-xs font-semibold",
                LEVEL_STYLE[lesson.level].solid,
              )}
            >
              {LEVEL_LABEL[lesson.level]}
            </span>
          </p>
          <p className="text-sm text-muted-foreground">
            {lesson.schoolName} · {lesson.enrolled} iscritti
            {lesson.instructorName && ` · ${lesson.instructorName}`}
          </p>
        </div>
        <StatusBadge status={lesson.status} solid={done || cancelled} />
      </div>

      {!editing ? (
        <div className="mt-3 flex flex-col gap-3">
          {done && (
            <p>
              <span className="text-3xl font-bold tabular-nums">{lesson.attendees_count}</span>
              <span className="text-muted-foreground"> / {lesson.enrolled} presenti</span>
            </p>
          )}
          {done && lesson.focus.length > 0 && (
            <ul className="flex flex-wrap gap-1.5">
              {lesson.focus.map((id) => (
                <li key={id} className={cn("rounded-full px-3 py-1 text-sm font-medium", LEVEL_STYLE[lesson.level].solid)}>
                  {focusLabel(id, lesson.focus_note)}
                </li>
              ))}
            </ul>
          )}
          {cancelled && <p className="text-sm text-muted-foreground">Annullata dall&apos;amministrazione.</p>}
          {!lesson.canEdit && !cancelled && (
            <p className="text-sm text-muted-foreground">Registrano gli istruttori di questa classe.</p>
          )}
          {isFuture && lesson.canEdit && !cancelled && (
            <p className="text-sm text-muted-foreground">Potrai registrarla il giorno della lezione.</p>
          )}
          {editable && done && (
            <Button variant="outline" onClick={() => setEditing(true)} className="h-11 self-start px-5">
              Modifica
            </Button>
          )}
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-5">
          {/* Presenti */}
          <div className="flex flex-col gap-2">
            <p className="font-semibold">Bambini presenti</p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                className="size-14 rounded-xl"
                onClick={() => setCountSafe(count - 1)}
                disabled={count <= 0}
                aria-label="Uno in meno"
              >
                <Minus className="size-6" />
              </Button>
              <Input
                type="number"
                inputMode="numeric"
                min={0}
                max={lesson.enrolled}
                value={count}
                onChange={(e) => setCountSafe(Number(e.target.value) || 0)}
                className="h-14 flex-1 text-center text-3xl font-bold tabular-nums"
                aria-label="Numero di presenti"
              />
              <Button
                type="button"
                variant="outline"
                className="size-14 rounded-xl"
                onClick={() => setCountSafe(count + 1)}
                disabled={count >= lesson.enrolled}
                aria-label="Uno in più"
              >
                <Plus className="size-6" />
              </Button>
            </div>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>su {lesson.enrolled} iscritti</span>
              {count !== lesson.enrolled && (
                <button
                  type="button"
                  className="min-h-11 font-medium text-primary underline underline-offset-4"
                  onClick={() => setCount(lesson.enrolled)}
                >
                  Tutti presenti
                </button>
              )}
            </div>
          </div>

          {/* Focus */}
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-semibold">
              Focus della lezione <span className="font-normal text-muted-foreground">(anche più di uno)</span>
            </legend>
            <div className="flex flex-wrap gap-2">
              {catalog.map((f) => (
                <label
                  key={f.id}
                  className={cn(
                    "group flex min-h-11 cursor-pointer flex-col justify-center rounded-2xl border-2 border-border bg-card px-4 py-2 text-sm font-semibold",
                    LEVEL_STYLE[lesson.level].checked,
                  )}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={focus.includes(f.id)}
                    onChange={() => toggleFocus(f.id)}
                  />
                  <span className="flex items-center gap-1.5">
                    <Check className="hidden size-4 group-has-checked:block" aria-hidden />
                    {f.label}
                  </span>
                  {f.description && (
                    <span className="text-xs font-normal opacity-90">{f.description}</span>
                  )}
                </label>
              ))}
            </div>
            {needsNote && (
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Gioco con… (es. palline, tubi, tappeto)"
                maxLength={200}
                className="h-11 text-base"
                aria-label="Gioco con"
              />
            )}
          </fieldset>

          {error && (
            <p className="text-sm font-medium text-cancelled-text" role="alert">
              {error}
            </p>
          )}

          <Button className="h-14 text-lg font-bold" disabled={pending} onClick={() => save(true)}>
            <Check className="size-6" strokeWidth={3} />
            {pending ? "Salvataggio…" : "Lezione svolta"}
          </Button>

          {done && (
            <div className="flex justify-between text-sm">
              <button
                type="button"
                className="min-h-11 text-muted-foreground underline underline-offset-4"
                onClick={() => save(false)}
                disabled={pending}
              >
                Non era svolta: riporta a “programmata”
              </button>
              <button
                type="button"
                className="min-h-11 text-muted-foreground underline underline-offset-4"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Annulla
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}
