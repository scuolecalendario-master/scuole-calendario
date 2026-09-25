import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { addDays, formatDay, isISODate, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { AttendanceCard, type AttendanceLesson } from "./attendance-card";

const LESSON_COLUMNS =
  "id, date, start_time, end_time, status, attendees_count, focus, focus_note, instructor_id, schools(name), classes(grade_name, total_enrolled, level, class_instructors(profile_id)), profiles(full_name, email)";
const BACKLOG_DAYS = 14;

export default async function TodayPage({ searchParams }: PageProps<"/istruttore/oggi">) {
  const me = await requireRole("instructor", "master");
  const { data: dataParam, vista } = await searchParams;
  const today = todayISO();
  const date = isISODate(dataParam) ? dataParam : today;
  const showAll = vista === "tutte";
  const isMaster = me.role === "master";

  const supabase = await createClient();
  const [{ data: dayRows }, { data: backlogRows }] = await Promise.all([
    supabase.from("lessons").select(LESSON_COLUMNS).eq("date", date).order("start_time"),
    // Lezioni passate ancora da registrare
    supabase
      .from("lessons")
      .select(LESSON_COLUMNS)
      .eq("status", "scheduled")
      .gte("date", addDays(today, -BACKLOG_DAYS))
      .lt("date", today)
      .order("date")
      .order("start_time"),
  ]);

  type Row = NonNullable<typeof dayRows>[number];
  const isMine = (l: Row) =>
    l.instructor_id === me.id || !!l.classes?.class_instructors.some((ci) => ci.profile_id === me.id);
  const toCard = (l: Row): AttendanceLesson => ({
    id: l.id,
    date: l.date,
    start_time: l.start_time,
    end_time: l.end_time,
    status: l.status,
    attendees_count: l.attendees_count,
    focus: l.focus,
    focus_note: l.focus_note,
    schoolName: l.schools?.name ?? "",
    gradeName: l.classes?.grade_name ?? "",
    level: l.classes?.level ?? "elementari",
    enrolled: l.classes?.total_enrolled ?? 0,
    instructorName: l.profiles?.full_name ?? l.profiles?.email ?? null,
    canEdit: isMaster || isMine(l),
  });

  const backlog = (backlogRows ?? []).filter((l) => (isMaster ? true : isMine(l))).map(toCard);
  const all = dayRows ?? [];
  const lessons = all.filter((l) => showAll || isMaster || isMine(l)).map(toCard);
  const hiddenCount = all.length - lessons.length;
  const toRecord = lessons.filter((l) => l.status === "scheduled" && l.canEdit).length;

  const href = (params: { data?: string; vista?: string }) => {
    const q = new URLSearchParams();
    if (params.data && params.data !== today) q.set("data", params.data);
    if (params.vista) q.set("vista", params.vista);
    const s = q.toString();
    return `/istruttore/oggi${s ? `?${s}` : ""}`;
  };
  const vistaParam = showAll ? "tutte" : undefined;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-5">
      {backlog.length > 0 && date === today && (
        <section className="flex flex-col gap-3 rounded-3xl bg-sun/25 p-3 ring-2 ring-sun">
          <h2 className="px-1 text-lg font-bold">
            Da registrare <span className="font-semibold">({backlog.length})</span>
          </h2>
          <ul className="flex flex-col gap-3">
            {backlog.map((l) => (
              <AttendanceCard key={`${l.id}-${l.status}`} lesson={l} isFuture={false} showDate />
            ))}
          </ul>
        </section>
      )}

      <nav className="flex items-center justify-between gap-2" aria-label="Giorno">
        <Link
          href={href({ data: addDays(date, -1), vista: vistaParam })}
          className="flex size-12 items-center justify-center rounded-xl border-2 bg-card"
          aria-label="Giorno precedente"
        >
          <ChevronLeft className="size-6" />
        </Link>
        <div className="text-center">
          <h1 className="text-xl font-bold first-letter:uppercase leading-tight">{formatDay(date)}</h1>
          {date !== today ? (
            <Link href={href({ vista: vistaParam })} className="text-sm font-medium text-primary underline underline-offset-4">
              Torna a oggi
            </Link>
          ) : (
            <p className="text-sm font-medium text-primary">Oggi</p>
          )}
        </div>
        <Link
          href={href({ data: addDays(date, 1), vista: vistaParam })}
          className="flex size-12 items-center justify-center rounded-xl border-2 bg-card"
          aria-label="Giorno successivo"
        >
          <ChevronRight className="size-6" />
        </Link>
      </nav>

      {!isMaster && (
        <div className="grid grid-cols-2 gap-1 rounded-2xl bg-muted p-1 text-sm font-semibold">
          {[
            { label: "Le mie classi", active: !showAll, to: href({ data: date }) },
            { label: "Tutte", active: showAll, to: href({ data: date, vista: "tutte" }) },
          ].map((t) => (
            <Link
              key={t.label}
              href={t.to}
              aria-current={t.active ? "page" : undefined}
              className={cn("flex min-h-11 items-center justify-center rounded-xl", t.active && "bg-primary text-primary-foreground")}
            >
              {t.label}
            </Link>
          ))}
        </div>
      )}

      {lessons.length > 0 && (
        <p className="font-medium">
          {toRecord === 0
            ? "Tutte le lezioni sono registrate ✓"
            : `${toRecord} ${toRecord === 1 ? "lezione da registrare" : "lezioni da registrare"}`}
        </p>
      )}

      {lessons.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Nessuna lezione{!showAll && hiddenCount > 0 ? " delle tue classi" : ""} in questo giorno.
          {!showAll && hiddenCount > 0 && (
            <Link href={href({ data: date, vista: "tutte" })} className="mt-2 block font-medium text-primary underline">
              Vedi tutte ({hiddenCount})
            </Link>
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lessons.map((l) => (
            <AttendanceCard
              // Rimonta la scheda quando i dati cambiano dopo il salvataggio
              key={`${l.id}-${l.status}-${l.attendees_count}-${l.focus.join()}`}
              lesson={l}
              isFuture={l.date > today}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
