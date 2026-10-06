"use client";

import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useState, useTransition } from "react";

import {
  createLessons,
  deleteLesson,
  updateLesson,
  type LessonActionResult,
} from "@/app/(staff)/admin/calendario/actions";
import { FocusPicker } from "@/components/lessons/focus-picker";
import { MoveLessonForm } from "@/components/lessons/move-lesson";
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
import { formatDay, formatTime, todayISO } from "@/lib/dates";
import { LEVEL_STYLE } from "@/lib/colors";
import { focusLabel } from "@/lib/focus";
import { cn } from "@/lib/utils";
import type { CalendarLesson, CalendarPerson, CalendarSchool, DialogTarget } from "./types";

export function LessonDialog({
  target,
  editable,
  schools,
  instructors,
  currentUserId,
  onClose,
  onSaved,
}: {
  target: DialogTarget | null;
  editable: boolean;
  schools: CalendarSchool[];
  instructors: CalendarPerson[];
  currentUserId: string;
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
            target.mode === "edit" && <LessonDetails target={target} schools={schools} instructors={instructors} currentUserId={currentUserId} />
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

/** Istruttori assegnati alla classe (unica fonte: pagina dell'istituto). */
function classInstructorNames(schools: CalendarSchool[], instructors: CalendarPerson[], classId: string) {
  const ids = schools.flatMap((s) => s.classes).find((c) => c.id === classId)?.instructorIds ?? [];
  return ids.map((id) => instructors.find((i) => i.id === id)?.name).filter(Boolean) as string[];
}

/** Sola lettura (istruttori), con il collegamento per registrare le proprie lezioni. */
function LessonDetails({
  target,
  schools,
  instructors,
  currentUserId,
}: {
  target: Extract<DialogTarget, { mode: "edit" }>;
  schools: CalendarSchool[];
  instructors: CalendarPerson[];
  currentUserId: string;
}) {
  const l = target.lesson;
  const names = classInstructorNames(schools, instructors, l.class_id);
  const classIds = schools.flatMap((s) => s.classes).find((c) => c.id === l.class_id)?.instructorIds ?? [];
  const mine = l.instructor_id === currentUserId || classIds.includes(currentUserId);
  // Si registra dal giorno della lezione in poi (come in "Oggi")
  const canRecord = mine && l.status !== "cancelled" && l.date <= todayISO();
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
        <dt className="text-muted-foreground">Istruttori</dt>
        <dd>{names.length ? names.join(", ") : "Nessuno assegnato alla classe"}</dd>
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
      </dl>
      {canRecord && (
        <Link
          href={`/istruttore/oggi?data=${l.date}`}
          className="flex h-11 items-center justify-center rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground"
        >
          {l.status === "done" ? "Modifica presenti e focus" : "Registra la lezione"}
        </Link>
      )}
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
  const [focus, setFocus] = useState<string[]>(lesson?.focus ?? []);
  const [focusNote, setFocusNote] = useState(lesson?.focus_note ?? "");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [moving, setMoving] = useState(false);
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  const classes = schools.find((s) => s.id === schoolId)?.classes ?? [];
  const enrolled = classes.find((c) => c.id === classId)?.total_enrolled;
  const instructorNames = classInstructorNames(schools, instructors, classId);

  function handle(result: LessonActionResult, message: string) {
    if (result.error) setError(result.error);
    else onSaved(message);
  }

  function submit(formData: FormData) {
    setError(undefined);
    const input = {
      classId,
      date: String(formData.get("date")),
      startTime: String(formData.get("start")),
      endTime: String(formData.get("end")),
    };

    startTransition(async () => {
      if (lesson) {
        const raw = String(formData.get("attendees") ?? "");
        handle(
          await updateLesson(lesson.id, {
            ...input,
            status,
            attendeesCount: status === "done" && raw !== "" ? Number(raw) : null,
            focus: status === "done" ? focus : [],
            focusNote: status === "done" ? focusNote : null,
            expectedUpdatedAt: lesson.updated_at,
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

  if (lesson && moving) {
    return (
      <MoveLessonForm
        lesson={{
          ...lesson,
          label: `${lesson.schools?.name} · Classe ${lesson.classes?.grade_name}`,
        }}
        onCancel={() => setMoving(false)}
        onMoved={onSaved}
      />
    );
  }

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

      {lesson && (
        // Spostare è l'operazione più frequente: in cima, senza scorrere
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-muted p-3">
          <p className="min-w-0 flex-1 font-semibold first-letter:uppercase">
            {formatDay(lesson.date)}
            <span className="block text-sm font-normal tabular-nums text-muted-foreground">
              {formatTime(lesson.start_time)}–{formatTime(lesson.end_time)}
            </span>
          </p>
          <Button type="button" variant="outline" className="bg-card" onClick={() => setMoving(true)} disabled={pending}>
            <CalendarClock aria-hidden /> Sposta
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Istituto" htmlFor="school">
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
        {classId && (
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-muted px-3 py-2 text-sm sm:col-span-2">
            <span className="font-medium">Istruttori:</span>
            <span>{instructorNames.length ? instructorNames.join(", ") : "nessuno assegnato alla classe"}</span>
            <Link href={`/admin/scuole/${schoolId}`} className="ml-auto font-semibold text-primary underline">
              Modifica nella classe
            </Link>
          </div>
        )}
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

        {lesson?.classes && status === "done" && (
          <Field label="Focus della lezione" htmlFor="focus" className="sm:col-span-2">
            <FocusPicker
              id="focus"
              level={lesson.classes.level}
              value={focus}
              note={focusNote}
              onChange={(f, n) => {
                setFocus(f);
                setFocusNote(n);
              }}
            />
          </Field>
        )}
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
          <span className="hidden sm:block" />
        )}
        {/* Su smartphone: due pulsanti a tutta larghezza, l'azione principale a destra */}
        <div className="grid grid-cols-2 gap-2 sm:flex">
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
