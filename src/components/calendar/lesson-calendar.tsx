"use client";

import "@fullcalendar/react/skeleton.css";
import "@fullcalendar/react/themes/forma/theme.css";

import FullCalendar, {
  type CalendarRef,
  type DatesSetInfo,
  type DateSelectInfo,
  type EventChangeInfo,
  type EventClickInfo,
  type EventInput,
  type EventSourceFuncInfo,
} from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/react/daygrid";
import interactionPlugin from "@fullcalendar/react/interaction";
import listPlugin from "@fullcalendar/react/list";
import itLocale from "@fullcalendar/react/locales/it";
import formaTheme from "@fullcalendar/react/themes/forma";
import timeGridPlugin from "@fullcalendar/react/timegrid";
import { useCallback, useMemo, useRef, useState } from "react";

import { moveLesson } from "@/app/(staff)/admin/calendario/actions";
import { STATUS_LABEL } from "@/components/lessons/status-badge";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createClient } from "@/lib/supabase/client";
import { LessonDialog } from "./lesson-dialog";
import type { CalendarLesson, CalendarPerson, CalendarSchool, DialogTarget } from "./types";

const TIME_ZONE = "Europe/Rome";
const PAGE = 1000; // limite righe per richiesta di PostgREST
const DEFAULT_DURATION_MIN = 45;

const LESSON_COLUMNS =
  "id, date, start_time, end_time, status, attendees_count, focus, focus_note, notes, class_id, school_id, instructor_id, classes(grade_name, total_enrolled, level), schools(name)";

/** "2026-09-24T09:00:00+02:00" → { date: "2026-09-24", time: "09:00" } (già nel fuso del calendario) */
function splitStr(str: string) {
  return { date: str.slice(0, 10), time: str.slice(11, 16) };
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const total = Math.min(h * 60 + m + minutes, 23 * 60 + 55);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export function LessonCalendar({
  editable,
  schools,
  instructors,
  currentUserId,
  initialDate,
  openLessonId,
}: {
  /** true = master: crea, sposta, modifica ed elimina. false = sola lettura. */
  editable: boolean;
  schools: CalendarSchool[];
  instructors: CalendarPerson[];
  currentUserId: string;
  /** Data su cui aprire il calendario (es. da "Apri nel calendario"). */
  initialDate?: string;
  /** Lezione di cui aprire subito il dettaglio. */
  openLessonId?: string;
}) {
  const calendarRef = useRef<CalendarRef>(null);
  const [schoolId, setSchoolId] = useState("");
  const [classId, setClassId] = useState("");
  const [instructorId, setInstructorId] = useState("");
  const [dialog, setDialog] = useState<DialogTarget | null>(null);
  const [notice, setNotice] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  // La lezione richiesta via URL si apre una sola volta, al primo caricamento
  const pendingOpen = useRef(openLessonId);

  const supabase = useMemo(() => createClient(), []);
  const colorBySchool = useMemo(() => new Map(schools.map((s) => [s.id, s.color])), [schools]);
  const classesOfSchool = schools.find((s) => s.id === schoolId)?.classes ?? [];
  // Su smartphone la vista a elenco è più leggibile della griglia oraria
  const [isMobile] = useState(() => window.matchMedia("(max-width: 767px)").matches);
  // Su smartphone il titolo (periodo visualizzato) sta sopra il calendario
  const [title, setTitle] = useState("");

  const fetchEvents = useCallback(
    async (info: EventSourceFuncInfo): Promise<EventInput[]> => {
      const from = info.startStr.slice(0, 10);
      const to = info.endStr.slice(0, 10); // esclusivo
      const lessons: CalendarLesson[] = [];

      for (let offset = 0; ; offset += PAGE) {
        let query = supabase
          .from("lessons")
          .select(LESSON_COLUMNS)
          .gte("date", from)
          .lt("date", to)
          .order("date")
          .order("start_time")
          .order("id")
          .range(offset, offset + PAGE - 1);
        if (schoolId) query = query.eq("school_id", schoolId);
        if (classId) query = query.eq("class_id", classId);
        if (instructorId === "none") query = query.is("instructor_id", null);
        else if (instructorId) query = query.eq("instructor_id", instructorId);

        const { data, error } = await query;
        if (error) throw new Error(error.message);
        lessons.push(...(data as CalendarLesson[]));
        if (data.length < PAGE) break;
      }

      const toOpen = pendingOpen.current && lessons.find((l) => l.id === pendingOpen.current);
      if (toOpen) {
        pendingOpen.current = undefined;
        // Il primo caricamento avviene mentre il calendario si sta montando
        setTimeout(() => setDialog({ mode: "edit", lesson: toOpen }), 0);
      }

      return lessons.map((l) => {
        const prefix = l.status === "done" ? "✓ " : l.status === "cancelled" ? "✕ " : "";
        return {
          id: l.id,
          // Classe prima della scuola: nella vista settimana il titolo viene troncato
          title: `${prefix}${l.classes?.grade_name ?? ""} · ${l.schools?.name ?? ""}`,
          start: `${l.date}T${l.start_time}`,
          end: `${l.date}T${l.end_time}`,
          color: colorBySchool.get(l.school_id),
          className: l.status === "cancelled" ? "lesson-cancelled" : undefined,
          extendedProps: { lesson: l },
        };
      });
    },
    [supabase, schoolId, classId, instructorId, colorBySchool],
  );

  const refetch = () => calendarRef.current?.getApi().refetchEvents();

  function onSaved(text: string) {
    setDialog(null);
    setNotice({ type: "ok", text });
    refetch();
  }

  function onSelect(info: DateSelectInfo) {
    calendarRef.current?.getApi().unselect();
    const start = splitStr(info.startStr);
    // Dalla vista mese (giornata intera) proponiamo un orario predefinito
    const startTime = info.allDay ? "09:00" : start.time;
    const endTime = info.allDay ? addMinutes("09:00", DEFAULT_DURATION_MIN) : splitStr(info.endStr).time;
    setDialog({ mode: "create", date: start.date, startTime, endTime });
  }

  async function onMove(info: EventChangeInfo) {
    const start = splitStr(info.event.startStr);
    const end = info.event.endStr ? splitStr(info.event.endStr) : null;
    if (!end || end.date !== start.date) {
      info.revert();
      setNotice({ type: "error", text: "Una lezione deve iniziare e finire nello stesso giorno." });
      return;
    }
    const result = await moveLesson(info.event.id, start.date, start.time, end.time);
    if (result.error) {
      info.revert();
      setNotice({ type: "error", text: result.error });
    } else {
      setNotice({ type: "ok", text: "Lezione spostata." });
      refetch(); // aggiorna i dati della lezione (extendedProps)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Su smartphone i filtri sono raccolti: prima il calendario (DESIGN.md §1) */}
      <details
        open={!isMobile}
        className="group rounded-2xl border-2 bg-card p-3 open:pb-4 md:border-0 md:bg-transparent md:p-0"
      >
        <summary className="flex min-h-11 cursor-pointer items-center justify-between font-semibold md:hidden">
          <span>
            Filtri
            {(schoolId || classId || instructorId) && <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">attivi</span>}
          </span>
          <span className="text-sm text-primary group-open:hidden">Mostra</span>
          <span className="hidden text-sm text-primary group-open:inline">Nascondi</span>
        </summary>
        <div className="mt-2 grid gap-3 sm:grid-cols-3 md:mt-0">
        <Filter label="Istituto" id="f-school">
          <NativeSelect
            id="f-school"
            value={schoolId}
            onChange={(e) => {
              setSchoolId(e.target.value);
              setClassId("");
            }}
          >
            <option value="">Tutti gli istituti</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </Filter>
        <Filter label="Classe" id="f-class">
          <NativeSelect
            id="f-class"
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            disabled={!schoolId}
          >
            <option value="">{schoolId ? "Tutte le classi" : "Scegli prima un istituto"}</option>
            {classesOfSchool.map((c) => (
              <option key={c.id} value={c.id}>
                {c.grade_name}
              </option>
            ))}
          </NativeSelect>
        </Filter>
        <Filter label="Istruttore" id="f-instructor">
          <NativeSelect id="f-instructor" value={instructorId} onChange={(e) => setInstructorId(e.target.value)}>
            <option value="">Tutti</option>
            {!editable && <option value={currentUserId}>Solo le mie lezioni</option>}
            {editable && <option value="none">Non assegnate</option>}
            {editable &&
              instructors.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name}
                </option>
              ))}
          </NativeSelect>
        </Filter>
        </div>
      </details>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        {schools
          .filter((s) => !schoolId || s.id === schoolId)
          .map((s) => (
            <span key={s.id} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              {s.name}
            </span>
          ))}
        <span>✓ {STATUS_LABEL.done} · ✕ {STATUS_LABEL.cancelled}</span>
        {editable && <span className="ml-auto hidden md:inline">Trascina per spostare · seleziona uno spazio vuoto per creare</span>}
      </div>

      {notice && (
        <p
          role={notice.type === "error" ? "alert" : "status"}
          className={notice.type === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}
        >
          {notice.text}
        </p>
      )}

      {isMobile && title && <h2 className="text-center text-lg font-bold first-letter:uppercase">{title}</h2>}

      <div className="lesson-calendar">
        <FullCalendar
          ref={calendarRef}
          plugins={[formaTheme, dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          locale={itLocale}
          timeZone={TIME_ZONE}
          // Su smartphone si parte dal giorno (più leggibile); le viste sono le stesse ovunque
          initialView={isMobile ? "timeGridDay" : "timeGridWeek"}
          initialDate={initialDate}
          datesSet={(info: DatesSetInfo) => setTitle(info.view.title)}
          headerToolbar={
            isMobile
              ? { start: "prev,next today", end: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }
              : { start: "prev,next today", center: "title", end: "dayGridMonth,timeGridWeek,timeGridDay,listWeek" }
          }
          firstDay={1}
          hiddenDays={[0]}
          allDaySlot={false}
          slotMinTime="07:00:00"
          slotMaxTime="19:00:00"
          // Righe da 30 minuti (pagina compatta), trascinamento a scatti di 15
          slotDuration="00:30:00"
          snapDuration="00:15:00"
          slotHeaderInterval="01:00:00"
          nowIndicator
          // Vista elenco su smartphone: il titolo va a capo invece di essere troncato
          listItemEventTitleClass="whitespace-normal break-words"
          listItemEventInnerClass="flex-wrap"
          height="auto"
          // Filtri: una nuova funzione events fa ricaricare le lezioni
          events={fetchEvents}
          eventSourceFailure={() =>
            setNotice({ type: "error", text: "Impossibile caricare le lezioni." })
          }
          editable={editable}
          eventDurationEditable={editable}
          selectable={editable}
          selectMirror
          select={onSelect}
          eventDrop={onMove}
          eventResize={onMove}
          eventClick={(info: EventClickInfo) => {
            info.jsEvent.preventDefault();
            setDialog({ mode: "edit", lesson: info.event.extendedProps.lesson as CalendarLesson });
          }}
        />
      </div>

      <LessonDialog
        target={dialog}
        editable={editable}
        schools={schools}
        instructors={instructors}
        onClose={() => setDialog(null)}
        onSaved={onSaved}
      />
    </div>
  );
}

function Filter({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
