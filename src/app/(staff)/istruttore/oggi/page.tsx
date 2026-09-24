import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { requireRole } from "@/lib/auth";
import { addDays, formatDay, isISODate, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { AttendanceCard, type AttendanceLesson } from "./attendance-card";

export default async function TodayPage({ searchParams }: PageProps<"/istruttore/oggi">) {
  const me = await requireRole("instructor", "master");
  const { data: dataParam, vista } = await searchParams;
  const today = todayISO();
  const date = isISODate(dataParam) ? dataParam : today;
  const showAll = vista === "tutte";

  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select(
      "id, date, start_time, end_time, status, attendees_count, notes, instructor_id, schools(name), classes(grade_name, total_enrolled), profiles(full_name, email)",
    )
    .eq("date", date)
    .order("start_time");

  // "Le mie": assegnate a me o ancora senza istruttore
  const lessons: AttendanceLesson[] = (data ?? [])
    .filter((l) => showAll || l.instructor_id === me.id || l.instructor_id === null)
    .map((l) => ({
      id: l.id,
      date: l.date,
      start_time: l.start_time,
      end_time: l.end_time,
      status: l.status,
      attendees_count: l.attendees_count,
      notes: l.notes,
      schoolName: l.schools?.name ?? "",
      gradeName: l.classes?.grade_name ?? "",
      enrolled: l.classes?.total_enrolled ?? 0,
      instructorName: l.profiles?.full_name ?? l.profiles?.email ?? null,
    }));
  const hiddenCount = (data?.length ?? 0) - lessons.length;
  const toRecord = lessons.filter((l) => l.status === "scheduled").length;

  const href = (params: { data?: string; vista?: string }) => {
    const q = new URLSearchParams();
    if (params.data && params.data !== today) q.set("data", params.data);
    if (params.vista) q.set("vista", params.vista);
    const s = q.toString();
    return `/istruttore/oggi${s ? `?${s}` : ""}`;
  };
  const vistaParam = showAll ? "tutte" : undefined;

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4">
      <nav className="flex items-center justify-between gap-2" aria-label="Giorno">
        <Link
          href={href({ data: addDays(date, -1), vista: vistaParam })}
          className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}
          aria-label="Giorno precedente"
        >
          ←
        </Link>
        <div className="text-center">
          <h1 className="text-lg font-bold capitalize leading-tight">{formatDay(date)}</h1>
          {date !== today ? (
            <Link href={href({ vista: vistaParam })} className="text-sm text-muted-foreground underline underline-offset-4">
              Torna a oggi
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">Oggi</p>
          )}
        </div>
        <Link
          href={href({ data: addDays(date, 1), vista: vistaParam })}
          className={cn(buttonVariants({ variant: "outline" }), "h-11 px-4")}
          aria-label="Giorno successivo"
        >
          →
        </Link>
      </nav>

      <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1 text-sm font-medium">
        <Link
          href={href({ data: date })}
          className={cn("rounded-lg py-2 text-center", !showAll && "bg-background shadow-xs")}
          aria-current={!showAll ? "page" : undefined}
        >
          Le mie
        </Link>
        <Link
          href={href({ data: date, vista: "tutte" })}
          className={cn("rounded-lg py-2 text-center", showAll && "bg-background shadow-xs")}
          aria-current={showAll ? "page" : undefined}
        >
          Tutte
        </Link>
      </div>

      {lessons.length > 0 && (
        <p className="text-sm text-muted-foreground">
          {toRecord === 0
            ? "Tutte le lezioni sono registrate ✓"
            : `${toRecord} ${toRecord === 1 ? "lezione da registrare" : "lezioni da registrare"}`}
        </p>
      )}

      {lessons.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">
          Nessuna lezione{!showAll && hiddenCount > 0 ? " assegnata a te" : ""} in questo giorno.
          {!showAll && hiddenCount > 0 && (
            <Link href={href({ data: date, vista: "tutte" })} className="mt-2 block underline underline-offset-4">
              Vedi tutte ({hiddenCount})
            </Link>
          )}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lessons.map((l) => (
            <AttendanceCard
              // Rimonta la scheda quando i dati cambiano dopo il salvataggio
              key={`${l.id}-${l.status}-${l.attendees_count}-${l.notes}`}
              lesson={l}
              isFuture={l.date > today}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
