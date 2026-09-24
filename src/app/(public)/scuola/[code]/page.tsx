import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { WeekSchedule } from "@/components/calendar/week-schedule";
import { buttonVariants } from "@/components/ui/button";
import { addDays, formatShort, isISODate, startOfWeek, todayISO } from "@/lib/dates";
import {
  createSchoolClient,
  isValidSchoolCode,
  normalizeSchoolCode,
} from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// Il codice è una credenziale: la pagina non va indicizzata.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SchoolCalendarPage({
  params,
  searchParams,
}: PageProps<"/scuola/[code]">) {
  const code = normalizeSchoolCode((await params).code);
  if (!isValidSchoolCode(code)) notFound();

  const { settimana, classe } = await searchParams;
  const weekStart = startOfWeek(isISODate(settimana) ? settimana : todayISO());
  const weekEnd = addDays(weekStart, 6);
  const classId =
    typeof classe === "string" && /^[0-9a-f-]{36}$/i.test(classe) ? classe : undefined;

  const supabase = createSchoolClient(code);

  let lessonsQuery = supabase
    .from("lessons")
    .select(
      "id, date, start_time, end_time, status, attendees_count, classes(grade_name, total_enrolled)",
    )
    .gte("date", weekStart)
    .lte("date", weekEnd)
    .order("date")
    .order("start_time");
  if (classId) lessonsQuery = lessonsQuery.eq("class_id", classId);

  const [{ data: school }, { data: classes }, { data: lessons, error }] =
    await Promise.all([
      supabase.from("schools").select("name").maybeSingle(),
      supabase.from("classes").select("id, grade_name").order("grade_name"),
      lessonsQuery,
    ]);

  if (!school) notFound();

  const href = (params: { settimana?: string; classe?: string }) => {
    const q = new URLSearchParams();
    if (params.settimana) q.set("settimana", params.settimana);
    if (params.classe) q.set("classe", params.classe);
    const s = q.toString();
    return `/scuola/${code}${s ? `?${s}` : ""}`;
  };

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
      <header className="mb-6">
        <p className="text-sm text-muted-foreground">Calendario lezioni di nuoto</p>
        <h1 className="text-2xl font-bold">{school.name}</h1>
      </header>

      <nav
        aria-label="Settimana"
        className="mb-4 flex flex-wrap items-center justify-between gap-2"
      >
        <div className="flex items-center gap-2">
          <Link
            href={href({ settimana: addDays(weekStart, -7), classe: classId })}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-label="Settimana precedente"
          >
            ←
          </Link>
          <Link
            href={href({ classe: classId })}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Oggi
          </Link>
          <Link
            href={href({ settimana: addDays(weekStart, 7), classe: classId })}
            className={buttonVariants({ variant: "outline", size: "sm" })}
            aria-label="Settimana successiva"
          >
            →
          </Link>
        </div>
        <span className="text-sm font-medium tabular-nums">
          {formatShort(weekStart)} – {formatShort(weekEnd)}
        </span>
      </nav>

      {classes && classes.length > 1 && (
        <nav aria-label="Filtra per classe" className="mb-4 flex flex-wrap gap-2">
          {[{ id: undefined, grade_name: "Tutte le classi" }, ...classes].map((c) => (
            <Link
              key={c.id ?? "all"}
              href={href({ settimana: weekStart, classe: c.id })}
              aria-current={c.id === classId ? "page" : undefined}
              className={cn(
                buttonVariants({
                  variant: c.id === classId ? "default" : "ghost",
                  size: "sm",
                }),
              )}
            >
              {c.grade_name}
            </Link>
          ))}
        </nav>
      )}

      {error ? (
        <p className="text-destructive">Impossibile caricare le lezioni.</p>
      ) : (
        <WeekSchedule weekStart={weekStart} lessons={lessons ?? []} />
      )}
    </main>
  );
}
