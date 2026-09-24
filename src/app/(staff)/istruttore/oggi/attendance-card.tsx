"use client";

import { useState, useTransition } from "react";

import { StatusBadge, type LessonStatus } from "@/components/lessons/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { recordLesson } from "./actions";

export type AttendanceLesson = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: LessonStatus;
  attendees_count: number | null;
  notes: string | null;
  schoolName: string;
  gradeName: string;
  enrolled: number;
  instructorName: string | null;
};

export function AttendanceCard({
  lesson,
  isFuture,
}: {
  lesson: AttendanceLesson;
  /** Lezione di un giorno futuro: si può annullare ma non segnare come svolta. */
  isFuture: boolean;
}) {
  const recorded = lesson.status !== "scheduled";
  const [editing, setEditing] = useState(!recorded);
  const [status, setStatus] = useState<LessonStatus | null>(recorded ? lesson.status : null);
  const [count, setCount] = useState(lesson.attendees_count ?? lesson.enrolled);
  const [notes, setNotes] = useState(lesson.notes ?? "");
  const [showNotes, setShowNotes] = useState(!!lesson.notes);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const setCountSafe = (n: number) => setCount(Math.max(0, Math.min(lesson.enrolled, n)));

  function save(nextStatus: LessonStatus) {
    setError(undefined);
    startTransition(async () => {
      const result = await recordLesson(lesson.id, {
        status: nextStatus,
        attendeesCount: nextStatus === "done" ? count : null,
        notes: notes || null,
      });
      if (result.error) setError(result.error);
      else setEditing(nextStatus === "scheduled");
    });
  }

  return (
    <li
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-xs",
        !editing && lesson.status === "cancelled" && "opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xl font-semibold tabular-nums">
            {formatTime(lesson.start_time)}–{formatTime(lesson.end_time)}
          </p>
          <p className="font-medium">
            {lesson.schoolName} · Classe {lesson.gradeName}
          </p>
          <p className="text-sm text-muted-foreground">
            {lesson.enrolled} iscritti
            {lesson.instructorName && ` · ${lesson.instructorName}`}
          </p>
        </div>
        <StatusBadge status={lesson.status} />
      </div>

      {!editing ? (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm">
            {lesson.status === "done" ? (
              <>
                <span className="text-2xl font-semibold tabular-nums">{lesson.attendees_count}</span>
                <span className="text-muted-foreground"> / {lesson.enrolled} presenti</span>
              </>
            ) : (
              <span className="text-muted-foreground">Lezione annullata</span>
            )}
            {lesson.notes && <span className="mt-1 block text-muted-foreground">“{lesson.notes}”</span>}
          </p>
          <Button variant="outline" onClick={() => setEditing(true)} className="h-10 px-4">
            Modifica
          </Button>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Esito lezione">
            <ChoiceButton
              selected={status === "done"}
              onClick={() => setStatus("done")}
              disabled={isFuture}
              tone="done"
            >
              ✓ Svolta
            </ChoiceButton>
            <ChoiceButton
              selected={status === "cancelled"}
              onClick={() => setStatus("cancelled")}
              tone="cancelled"
            >
              ✕ Annullata
            </ChoiceButton>
          </div>
          {isFuture && (
            <p className="-mt-2 text-xs text-muted-foreground">
              Lezione futura: puoi solo segnarla come annullata.
            </p>
          )}

          {status === "done" && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">Bambini presenti</p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="size-14 text-2xl"
                  onClick={() => setCountSafe(count - 1)}
                  disabled={count <= 0}
                  aria-label="Uno in meno"
                >
                  −
                </Button>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={lesson.enrolled}
                  value={count}
                  onChange={(e) => setCountSafe(Number(e.target.value) || 0)}
                  className="h-14 flex-1 text-center text-3xl font-semibold tabular-nums"
                  aria-label="Numero di presenti"
                />
                <Button
                  type="button"
                  variant="outline"
                  className="size-14 text-2xl"
                  onClick={() => setCountSafe(count + 1)}
                  disabled={count >= lesson.enrolled}
                  aria-label="Uno in più"
                >
                  +
                </Button>
              </div>
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>su {lesson.enrolled} iscritti</span>
                {count !== lesson.enrolled && (
                  <button
                    type="button"
                    className="underline underline-offset-4"
                    onClick={() => setCount(lesson.enrolled)}
                  >
                    Tutti presenti
                  </button>
                )}
              </div>
            </div>
          )}

          {showNotes ? (
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Note (es. vasca chiusa, bambino infortunato…)"
              maxLength={1000}
              rows={2}
              className="text-base"
            />
          ) : (
            <button
              type="button"
              className="self-start text-sm text-muted-foreground underline underline-offset-4"
              onClick={() => setShowNotes(true)}
            >
              + Aggiungi una nota
            </button>
          )}

          {error && (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          )}

          <Button
            className="h-12 text-base"
            disabled={!status || pending}
            onClick={() => status && save(status)}
          >
            {pending ? "Salvataggio…" : "Salva"}
          </Button>

          {recorded && (
            <div className="flex justify-between text-sm">
              <button
                type="button"
                className="text-muted-foreground underline underline-offset-4"
                onClick={() => save("scheduled")}
                disabled={pending}
              >
                Riporta a “programmata”
              </button>
              <button
                type="button"
                className="text-muted-foreground underline underline-offset-4"
                onClick={() => setEditing(false)}
                disabled={pending}
              >
                Annulla modifica
              </button>
            </div>
          )}
        </div>
      )}
    </li>
  );
}

function ChoiceButton({
  selected,
  tone,
  className,
  ...props
}: React.ComponentProps<"button"> & { selected: boolean; tone: "done" | "cancelled" }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      className={cn(
        "h-14 rounded-xl border-2 text-base font-semibold transition-colors disabled:opacity-40",
        selected
          ? tone === "done"
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-destructive bg-destructive text-white"
          : "border-border bg-background",
        className,
      )}
      {...props}
    />
  );
}
