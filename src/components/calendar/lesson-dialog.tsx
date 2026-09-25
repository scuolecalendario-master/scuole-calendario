"use client";

import Link from "next/link";
import { useState, useTransition } from "react";

import {
  createLessons,
  deleteLesson,
  updateLesson,
  type LessonActionResult,
} from "@/app/(staff)/admin/calendario/actions";
import { STATUS_LABEL, StatusBadge, type LessonStatus } from "@/components/lessons/status-badge";
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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { formatDay, formatTime } from "@/lib/dates";
import { LEVEL_STYLE } from "@/lib/colors";
import { focusLabel } from "@/lib/focus";
import { cn } from "@/lib/utils";
import type { CalendarLesson, CalendarPerson, CalendarSchool, DialogTarget } from "./types";

export function LessonDialog({
  target,
  editable,
  schools,
  instructors,
  onClose,
  onSaved,
}: {
  target: DialogTarget | null;
  editable: boolean;
  schools: CalendarSchool[];
  instructors: CalendarPerson[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        {target &&
          (editable ? (
            <LessonForm
              // Rimonta il form a ogni apertura per ripartire dai valori della lezione
              key={target.mode === "edit" ? target.lesson.id : `new-${target.date}-${target.startTime}`}
              target={target}
              schools={schools}
              instructors={instructors}
              onClose={onClose}
              onSaved={onSaved}
            />
          ) : (
            target.mode === "edit" && <LessonDetails target={target} instructors={instructors} />
          ))}
      </DialogContent>
    </Dialog>
  );
}

/** Focus registrati dall'istruttore (sola lettura). */
function FocusList({ lesson }: { lesson: CalendarLesson }) {
  if (lesson.status !== "done" || !lesson.focus.length || !lesson.classes) return null;
  return (
    <ul className="flex flex-wrap gap-1.5">
      {lesson.focus.map((f) => (
        <li key={f} className={cn("rounded-full px-3 py-1 text-sm font-semibold", LEVEL_STYLE[lesson.classes!.level].solid)}>
          {focusLabel(f, lesson.focus_note)}
        </li>
      ))}
    </ul>
  );
}

/** Sola lettura (istruttori). */
function LessonDetails({
  target,
  instructors,
}: {
  target: Extract<DialogTarget, { mode: "edit" }>;
  instructors: CalendarPerson[];
}) {
  const l = target.lesson;
  const instructor = instructors.find((i) => i.id === l.instructor_id)?.name;
  return (
    <>
      <DialogHeader>
        <DialogTitle>
          {l.schools?.name} · Classe {l.classes?.grade_name}
        </DialogTitle>
        <DialogDescription className="first-letter:uppercase">
          {formatDay(l.date)}, {formatTime(l.start_time)}–{formatTime(l.end_time)}
        </DialogDescription>
      </DialogHeader>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-muted-foreground">Stato</dt>
        <dd><StatusBadge status={l.status} /></dd>
        <dt className="text-muted-foreground">Istruttore</dt>
        <dd>{instructor ?? "Non assegnato"}</dd>
        <dt className="text-muted-foreground">Presenti</dt>
        <dd className="tabular-nums">
          {l.attendees_count ?? "—"} / {l.classes?.total_enrolled}
        </dd>
        {l.status === "done" && l.focus.length > 0 && (
          <>
            <dt className="text-muted-foreground">Focus</dt>
            <dd>
              <FocusList lesson={l} />
            </dd>
          </>
        )}
        {l.notes && (
          <>
            <dt className="text-muted-foreground">Note</dt>
            <dd className="whitespace-pre-wrap">{l.notes}</dd>
          </>
        )}
      </dl>
    </>
  );
}

/** Creazione e modifica (master). */
function LessonForm({
  target,
  schools,
  instructors,
  onClose,
  onSaved,
}: {
  target: DialogTarget;
  schools: CalendarSchool[];
  instructors: CalendarPerson[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const lesson = target.mode === "edit" ? target.lesson : null;
  const [schoolId, setSchoolId] = useState(lesson?.school_id ?? schools[0]?.id ?? "");
  const [classId, setClassId] = useState(lesson?.class_id ?? "");
  const [status, setStatus] = useState<LessonStatus>(lesson?.status ?? "scheduled");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const classes = schools.find((s) => s.id === schoolId)?.classes ?? [];
  const enrolled = classes.find((c) => c.id === classId)?.total_enrolled;

  function handle(result: LessonActionResult, message: string) {
    if (result.error) setError(result.error);
    else onSaved(message);
  }

  function submit(formData: FormData) {
    setError(undefined);
    const input = {
      classId,
      instructorId: String(formData.get("instructor") || "") || null,
      date: String(formData.get("date")),
      startTime: String(formData.get("start")),
      endTime: String(formData.get("end")),
      notes: String(formData.get("notes") ?? "") || null,
    };

    startTransition(async () => {
      if (lesson) {
        const raw = String(formData.get("attendees") ?? "");
        handle(
          await updateLesson(lesson.id, {
            ...input,
            status,
            attendeesCount: status === "done" && raw !== "" ? Number(raw) : null,
          }),
          "Lezione aggiornata.",
        );
      } else {
        const result = await createLessons(input, null);
        handle(result, result.count === 1 ? "Lezione creata." : `${result.count} lezioni create.`);
      }
    });
  }

  function remove() {
    if (!lesson) return;
    if (!confirmDelete) return setConfirmDelete(true);
    startTransition(async () => handle(await deleteLesson(lesson.id), "Lezione eliminata."));
  }

  const defaults =
    target.mode === "edit"
      ? { date: target.lesson.date, start: formatTime(target.lesson.start_time), end: formatTime(target.lesson.end_time) }
      : { date: target.date, start: target.startTime, end: target.endTime };

  return (
    <form
      // onSubmit (non action): in caso di errore i campi non vengono azzerati
      onSubmit={(e) => {
        e.preventDefault();
        submit(new FormData(e.currentTarget));
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>{lesson ? "Modifica lezione" : "Nuova lezione"}</DialogTitle>
        <DialogDescription>
          {lesson ? `${lesson.schools?.name} · Classe ${lesson.classes?.grade_name}` : "Programma una lezione per una classe."}
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Scuola" htmlFor="school">
          <NativeSelect
            id="school"
            value={schoolId}
            onChange={(e) => {
              setSchoolId(e.target.value);
              setClassId("");
            }}
            required
          >
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Classe" htmlFor="class">
          <NativeSelect id="class" value={classId} onChange={(e) => setClassId(e.target.value)} required>
            <option value="" disabled>
              {classes.length ? "Seleziona…" : "Nessuna classe"}
            </option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade_name} ({c.total_enrolled} iscritti)
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Istruttore" htmlFor="instructor" className="sm:col-span-2">
          <NativeSelect id="instructor" name="instructor" defaultValue={lesson?.instructor_id ?? ""}>
            <option value="">Non assegnato</option>
            {instructors.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name}
              </option>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Data" htmlFor="date" className="sm:col-span-2">
          <Input id="date" name="date" type="date" defaultValue={defaults.date} required />
        </Field>
        <Field label="Inizio" htmlFor="start">
          <Input id="start" name="start" type="time" step={300} defaultValue={defaults.start} required />
        </Field>
        <Field label="Fine" htmlFor="end">
          <Input id="end" name="end" type="time" step={300} defaultValue={defaults.end} required />
        </Field>

        {!lesson && (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            Per un corso che si ripete ogni settimana usa{" "}
            <Link href="/admin/programma" className="font-semibold text-primary underline">
              Corsi
            </Link>
            .
          </p>
        )}

        {lesson && (
          <>
            <Field label="Stato" htmlFor="status">
              <NativeSelect
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as LessonStatus)}
              >
                {(Object.keys(STATUS_LABEL) as LessonStatus[]).map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABEL[s]}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label={`Presenti${enrolled != null ? ` (max ${enrolled})` : ""}`} htmlFor="attendees">
              <Input
                id="attendees"
                name="attendees"
                type="number"
                inputMode="numeric"
                min={0}
                max={enrolled}
                defaultValue={lesson.attendees_count ?? ""}
                disabled={status !== "done"}
              />
            </Field>
          </>
        )}

        {lesson && lesson.status === "done" && lesson.focus.length > 0 && (
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm font-medium">Focus (registrati dall&apos;istruttore)</span>
            <FocusList lesson={lesson} />
          </div>
        )}

        <Field label="Note interne" htmlFor="notes" className="sm:col-span-2">
          <Textarea id="notes" name="notes" rows={2} maxLength={1000} defaultValue={lesson?.notes ?? ""} />
        </Field>
      </div>

      {error && (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      )}

      <DialogFooter className="gap-2 sm:justify-between">
        {lesson ? (
          <Button type="button" variant="destructive" onClick={remove} disabled={pending}>
            {confirmDelete ? "Conferma eliminazione" : "Elimina"}
          </Button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
            Annulla
          </Button>
          <Button type="submit" disabled={pending || !classId}>
            {pending ? "Salvataggio…" : "Salva"}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  className,
  children,
}: {
  label: string;
  htmlFor: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
