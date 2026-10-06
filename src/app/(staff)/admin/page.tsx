import { Bell, ChevronRight, ClipboardCheck, Waves } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/lessons/status-badge";
import { getLessonsToRecord, getOpenRequests } from "@/lib/admin-stats";
import { addDays, formatCompact, formatDay, formatTime, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { orThrow } from "@/lib/db";
import { cn } from "@/lib/utils";

const lessonHref = (l: { id: string; date: string }) => `/admin/calendario?data=${l.date}&lezione=${l.id}`;

/**
 * Pannello "Oggi": prima le cose da fare (DESIGN.md §2). I riquadri vuoti si
 * riducono a una riga "✓", così in alto resta solo ciò che richiede attenzione.
 */
export default async function AdminDashboard() {
  const today = todayISO();
  const tomorrow = addDays(today, 1);
  const supabase = await createClient();
  const [requests, toRecord, upcoming] = await Promise.all([
    getOpenRequests(5),
    getLessonsToRecord(),
    supabase
      .from("lessons")
      .select("id, date, start_time, end_time, status, schools(name), classes(grade_name)")
      .in("date", [today, tomorrow])
      .order("date")
      .order("start_time")
      .then(orThrow),
  ]);
  const todayLessons = upcoming.filter((l) => l.date === today);
  const tomorrowLessons = upcoming.filter((l) => l.date === tomorrow);

  // Da registrare, raggruppate per istruttore della classe (o "Senza istruttore")
  type Row = (typeof toRecord)[number];
  const byInstructor = new Map<string, Row[]>();
  for (const l of toRecord) {
    const names = l.classes?.class_instructors
      .map((ci) => ci.profiles?.full_name ?? ci.profiles?.email)
      .filter(Boolean) as string[];
    const key = names?.length ? names.join(", ") : "Senza istruttore";
    byInstructor.set(key, [...(byInstructor.get(key) ?? []), l]);
  }

  const allClear = requests.length === 0 && toRecord.length === 0;
  // Da computer una colonna per riquadro presente (1–3)
  const panels = 1 + (requests.length > 0 ? 1 : 0) + (toRecord.length > 0 ? 1 : 0);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold first-letter:uppercase">{formatDay(today)}</h1>

      {allClear && (
        <p className="flex flex-wrap gap-x-4 gap-y-1 rounded-2xl bg-done-soft px-4 py-3 font-semibold text-done-text">
          <span>✓ Nessuna richiesta</span>
          <span>✓ Lezioni passate tutte registrate</span>
        </p>
      )}

      <div className={cn("grid items-start gap-4", ["", "max-w-2xl", "lg:grid-cols-2", "lg:grid-cols-3"][panels])}>
        {requests.length > 0 && (
          <Panel tone="coral" icon={Bell} title="Richieste" count={requests.length}>
            <ul className="flex flex-col gap-2">
              {requests.slice(0, 3).map((r) => (
                <li key={r.id} className="rounded-xl bg-muted p-3 text-sm">
                  <p className="font-semibold">
                    {r.schools?.name} · {r.lessons?.classes?.grade_name}{" "}
                    <span className="first-letter:uppercase">{r.lessons ? `(${formatCompact(r.lessons.date)})` : ""}</span>
                  </p>
                  <p className="line-clamp-2 text-muted-foreground">{r.message}</p>
                </li>
              ))}
            </ul>
            <PanelLink href="/admin/richieste">Gestisci le richieste</PanelLink>
          </Panel>
        )}

        {toRecord.length > 0 && (
          <Panel tone="sun" icon={ClipboardCheck} title="Da registrare" count={toRecord.length}>
            <ul className="flex flex-col gap-3">
              {[...byInstructor].map(([name, lessons]) => (
                <li key={name}>
                  <p className="font-semibold">
                    {name} <span className="text-muted-foreground">({lessons.length})</span>
                  </p>
                  <ul className="mt-1 flex flex-col gap-1 text-sm">
                    {lessons.slice(0, 4).map((l) => (
                      <li key={l.id}>
                        <Link href={lessonHref(l)} className="flex min-h-11 items-center gap-2 rounded-lg px-2 hover:bg-muted">
                          <span className="font-medium whitespace-nowrap">{formatCompact(l.date)}</span>
                          <span className="tabular-nums">{formatTime(l.start_time)}</span>
                          <span className="min-w-0 flex-1 truncate text-muted-foreground">
                            {l.classes?.grade_name} · {l.schools?.name}
                          </span>
                        </Link>
                      </li>
                    ))}
                    {lessons.length > 4 && <li className="px-2 text-muted-foreground">e altre {lessons.length - 4}…</li>}
                  </ul>
                </li>
              ))}
            </ul>
          </Panel>
        )}

        <Panel
          tone="turquoise"
          icon={Waves}
          title="Lezioni di oggi"
          count={todayLessons.length}
        >
          <LessonList lessons={todayLessons} empty="Nessuna lezione oggi." />
          {tomorrowLessons.length > 0 && (
            <>
              <h3 className="mt-1 font-semibold">Domani · {tomorrowLessons.length}</h3>
              <LessonList lessons={tomorrowLessons} empty="" />
            </>
          )}
          <PanelLink href="/admin/calendario">Apri il calendario</PanelLink>
        </Panel>
      </div>
    </div>
  );
}

const TONE = {
  coral: { border: "border-coral", icon: "bg-coral" },
  sun: { border: "border-sun", icon: "bg-sun" },
  turquoise: { border: "border-turquoise", icon: "bg-turquoise" },
};

function Panel({
  tone,
  icon: Icon,
  title,
  count,
  className,
  children,
}: {
  tone: keyof typeof TONE;
  icon: typeof Bell;
  title: string;
  count: number;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={cn("flex min-w-0 flex-col gap-3 rounded-3xl border-2 bg-card p-4", TONE[tone].border, className)}>
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className={cn("flex size-10 items-center justify-center rounded-xl", TONE[tone].icon)}>
          <Icon className="size-5 text-foreground" aria-hidden />
        </span>
        {title}
        <span className="ml-auto text-3xl tabular-nums">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function PanelLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="flex min-h-11 items-center gap-1 font-semibold text-primary">
      {children} <ChevronRight className="size-4" aria-hidden />
    </Link>
  );
}

/** Lezioni del giorno: un tocco apre la lezione nel calendario (modifica, Sposta). */
function LessonList({
  lessons,
  empty,
}: {
  lessons: {
    id: string;
    date: string;
    start_time: string;
    end_time: string;
    status: "scheduled" | "done" | "cancelled";
    schools: { name: string } | null;
    classes: { grade_name: string } | null;
  }[];
  empty: string;
}) {
  if (!lessons.length) return empty ? <p className="text-muted-foreground">{empty}</p> : null;
  return (
    <ul className="flex flex-col gap-2">
      {lessons.map((l) => (
        <li key={l.id}>
          <Link
            href={lessonHref(l)}
            className={cn(
              "flex min-h-11 items-center gap-3 rounded-xl bg-muted px-3 py-2 hover:bg-scheduled-soft",
              l.status === "cancelled" && "opacity-70",
            )}
          >
            <span className="font-bold tabular-nums">{formatTime(l.start_time)}</span>
            <span className="min-w-0 flex-1 leading-snug">
              <span className="font-semibold">{l.classes?.grade_name}</span>
              <span className="block text-sm text-muted-foreground">{l.schools?.name}</span>
            </span>
            <StatusBadge status={l.status} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
