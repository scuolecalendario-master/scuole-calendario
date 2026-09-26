import { ChevronLeft, Printer } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusBadge } from "@/components/lessons/status-badge";
import { classColor } from "@/lib/colors";
import {
  addDays,
  formatCompact,
  formatDay,
  formatMonth,
  formatTime,
  nowTimeRome,
  relativeDay,
  startOfSchoolYear,
  todayISO,
} from "@/lib/dates";
import { focusLabel, LEVEL_LABEL } from "@/lib/focus";
import { getPortalSchool, UUID } from "@/lib/portal";
import { cn } from "@/lib/utils";
import { ChangeClassButton, RememberClass } from "../../remember-class";
import { HomeLogo } from "@/components/brand";
import { InstallBanner } from "@/components/install/install-banner";
import { RequestChangeButton } from "./request-dialog";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function ClassPortalPage({ params }: PageProps<"/scuola/[code]/classe/[classId]">) {
  const { code: rawCode, classId } = await params;
  if (!UUID.test(classId)) notFound();
  const { code, school, supabase } = await getPortalSchool(rawCode);

  const today = todayISO();
  const yearStart = startOfSchoolYear(today);
  const [{ data: cls }, { data: lessons }] = await Promise.all([
    supabase.from("classes").select("id, grade_name, level, sites(name)").eq("id", classId).maybeSingle(),
    supabase
      .from("lessons")
      .select("id, date, start_time, end_time, status, attendees_count, focus, focus_note")
      .eq("class_id", classId)
      .gte("date", yearStart)
      .lt("date", addDays(yearStart, 366))
      .order("date")
      .order("start_time"),
  ]);
  if (!cls) notFound();

  const color = classColor(cls.id);
  // Il master può disattivare le richieste di spostamento per l'istituto
  const canRequest = school.change_requests_enabled;
  const now = nowTimeRome();
  const isUpcoming = (l: { date: string; end_time: string }) =>
    l.date > today || (l.date === today && l.end_time.slice(0, 5) > now);

  const all = lessons ?? [];
  const upcoming = all.filter(isUpcoming);
  const past = all.filter((l) => !isUpcoming(l)).reverse();
  const next = upcoming.find((l) => l.status !== "cancelled");
  const byMonth = Map.groupBy(upcoming, (l) => formatMonth(l.date));
  const lessonLabel = (l: { date: string; start_time: string; end_time: string }) =>
    `${formatDay(l.date)}, ${formatTime(l.start_time)}–${formatTime(l.end_time)}`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-5 sm:px-6">
      <RememberClass code={code} classId={cls.id} />

      <div className="mb-4 flex items-center justify-between gap-2">
        {/* Il logo è il tasto Home: riporta alla classe ricordata */}
        <HomeLogo href="/" />
        <Link
          href={`/scuola/${code}/classe/${cls.id}/stampa`}
          className="flex min-h-11 items-center gap-2 rounded-xl border-2 bg-card px-4 font-semibold"
        >
          <Printer className="size-5" aria-hidden />
          Stampa
        </Link>
      </div>

      <header className="mb-4">
        <p className="flex flex-wrap items-center gap-x-3 text-sm font-semibold text-muted-foreground">
          <span>
            {school.name}
            {cls.sites?.name ? ` · ${cls.sites.name}` : ""}
          </span>
          <ChangeClassButton code={code} className="min-h-11 font-semibold text-primary underline underline-offset-4" />
        </p>
        <h1 className="text-3xl font-bold">
          Classe {cls.grade_name}{" "}
          <span className="align-middle text-base font-semibold text-muted-foreground">{LEVEL_LABEL[cls.level]}</span>
        </h1>
      </header>

      {/* Prossima lezione: l'informazione più importante */}
      <section
        className="mb-8 rounded-3xl p-5 text-white shadow-sm"
        style={{ backgroundColor: color }}
        aria-labelledby="next-title"
      >
        <h2 id="next-title" className="text-sm font-bold tracking-wide uppercase opacity-90">
          Prossima lezione
        </h2>
        {next ? (
          <>
            <p className="mt-1 text-3xl leading-tight font-bold first-letter:uppercase sm:text-4xl">{formatDay(next.date)}</p>
            <p className="text-2xl font-bold tabular-nums">
              {formatTime(next.start_time)}–{formatTime(next.end_time)}
            </p>
            <p className="mt-1 inline-block rounded-full bg-white px-3 py-0.5 text-sm font-bold" style={{ color }}>
              {relativeDay(next.date, today)}
            </p>
            {canRequest && (
              <div className="mt-4">
                <RequestChangeButton
                  code={code}
                  lesson={{ id: next.id, label: lessonLabel(next) }}
                  variant="onColor"
                />
              </div>
            )}
          </>
        ) : (
          <p className="mt-1 text-2xl font-bold">Nessuna lezione in programma</p>
        )}
      </section>

      <InstallBanner text="La prossima lezione a un tocco dalla Home." className="-mt-4 mb-8" />

      {upcoming.length > 0 && (
        <section className="mb-8 flex flex-col gap-4">
          <h2 className="text-xl font-bold">Calendario della classe</h2>
          {[...byMonth].map(([month, items]) => (
            <div key={month}>
              <h3 className="mb-2 font-bold first-letter:uppercase text-primary">{month}</h3>
              <ul className="flex flex-col gap-2">
                {items.map((l) => (
                  <li
                    key={l.id}
                    className={cn(
                      "flex items-center gap-3 rounded-2xl border-2 bg-card p-3",
                      l.id === next?.id && "border-primary",
                      l.status === "cancelled" && "opacity-70",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className={cn("font-bold first-letter:uppercase", l.status === "cancelled" && "line-through")}>
                        {formatCompact(l.date)} · {formatTime(l.start_time)}–{formatTime(l.end_time)}
                      </p>
                      {l.status === "cancelled" && <StatusBadge status="cancelled" className="mt-1" />}
                    </div>
                    {canRequest && l.status !== "cancelled" && (
                      <RequestChangeButton code={code} lesson={{ id: l.id, label: lessonLabel(l) }} variant="compact" />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {past.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xl font-bold">Lezioni passate</h2>
          <ul className="flex flex-col gap-2">
            {past.map((l) => (
              <li key={l.id} className="rounded-2xl border-2 bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold first-letter:uppercase">
                    {formatCompact(l.date)} · {formatTime(l.start_time)}
                  </p>
                  {l.status === "scheduled" ? (
                    <span className="text-sm text-muted-foreground">Da registrare</span>
                  ) : (
                    <StatusBadge status={l.status} />
                  )}
                </div>
                {l.status === "done" && (
                  <>
                    {l.attendees_count != null && (
                      <p className="mt-1 text-sm text-muted-foreground">{l.attendees_count} bambini presenti</p>
                    )}
                    {l.focus.length > 0 && (
                      <ul className="mt-2 flex flex-wrap gap-1.5" aria-label="Focus della lezione">
                        {l.focus.map((f) => (
                          <li
                            key={f}
                            className="rounded-full px-3 py-1 text-sm font-semibold text-white"
                            style={{ backgroundColor: color }}
                          >
                            {focusLabel(f, l.focus_note)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-8 text-center">
        <Link href={`/scuola/${code}?scegli=1`} className="inline-flex min-h-11 items-center gap-1 font-medium text-primary">
          <ChevronLeft className="size-4" aria-hidden />
          Tutte le classi di {school.name}
        </Link>
      </p>
    </main>
  );
}
