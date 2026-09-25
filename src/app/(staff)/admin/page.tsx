import { Bell, ClipboardCheck, Waves } from "lucide-react";
import Link from "next/link";

import { StatusBadge } from "@/components/lessons/status-badge";
import { NotificationsToggle } from "@/components/notifications-toggle";
import { getLessonsToRecord, getOpenRequests } from "@/lib/admin-stats";
import { formatCompact, formatDay, formatTime, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

/** Pannello "Oggi": le cose da fare per prime (DESIGN.md §2). */
export default async function AdminDashboard() {
  const today = todayISO();
  const supabase = await createClient();
  const [requests, toRecord, { data: todayLessons }] = await Promise.all([
    getOpenRequests(5),
    getLessonsToRecord(),
    supabase
      .from("lessons")
      .select("id, start_time, end_time, status, attendees_count, schools(name), classes(grade_name, total_enrolled)")
      .eq("date", today)
      .order("start_time"),
  ]);

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

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-2xl font-bold capitalize">{formatDay(today)}</h1>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Richieste di spostamento */}
        <section className="flex flex-col gap-3 rounded-3xl border-2 border-coral bg-card p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="flex size-10 items-center justify-center rounded-xl bg-coral">
              <Bell className="size-5 text-foreground" aria-hidden />
            </span>
            Richieste
            <span className="ml-auto text-3xl tabular-nums">{requests.length}</span>
          </h2>
          {requests.length === 0 ? (
            <p className="text-muted-foreground">Nessuna richiesta da gestire ✓</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {requests.slice(0, 3).map((r) => (
                <li key={r.id} className="rounded-xl bg-muted p-3 text-sm">
                  <p className="font-semibold">
                    {r.schools?.name} · {r.lessons?.classes?.grade_name}{" "}
                    <span className="capitalize">{r.lessons ? `(${formatCompact(r.lessons.date)})` : ""}</span>
                  </p>
                  <p className="line-clamp-2 text-muted-foreground">{r.message}</p>
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/richieste" className="mt-auto min-h-11 content-center font-semibold text-primary">
            Vedi tutte le richieste →
          </Link>
          <NotificationsToggle />
        </section>

        {/* Lezioni da registrare */}
        <section className="flex flex-col gap-3 rounded-3xl border-2 border-sun bg-card p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="flex size-10 items-center justify-center rounded-xl bg-sun">
              <ClipboardCheck className="size-5 text-foreground" aria-hidden />
            </span>
            Da registrare
            <span className="ml-auto text-3xl tabular-nums">{toRecord.length}</span>
          </h2>
          {toRecord.length === 0 ? (
            <p className="text-muted-foreground">Tutte le lezioni passate sono registrate ✓</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {[...byInstructor].map(([name, lessons]) => (
                <li key={name}>
                  <p className="font-semibold">
                    {name} <span className="text-muted-foreground">({lessons.length})</span>
                  </p>
                  <ul className="mt-1 flex flex-col gap-1 text-sm">
                    {lessons.slice(0, 4).map((l) => (
                      <li key={l.id}>
                        <Link
                          href={`/admin/calendario?data=${l.date}&lezione=${l.id}`}
                          className="flex min-h-9 items-center gap-2 rounded-lg px-2 hover:bg-muted"
                        >
                          <span className="font-medium capitalize">{formatCompact(l.date)}</span>
                          <span className="tabular-nums">{formatTime(l.start_time)}</span>
                          <span className="truncate text-muted-foreground">
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
          )}
        </section>

        {/* Lezioni di oggi */}
        <section className="flex flex-col gap-3 rounded-3xl border-2 border-turquoise bg-card p-4">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <span className="flex size-10 items-center justify-center rounded-xl bg-turquoise">
              <Waves className="size-5 text-foreground" aria-hidden />
            </span>
            Oggi
            <span className="ml-auto text-3xl tabular-nums">{todayLessons?.length ?? 0}</span>
          </h2>
          {!todayLessons?.length ? (
            <p className="text-muted-foreground">Nessuna lezione oggi.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {todayLessons.map((l) => (
                <li key={l.id} className="flex items-center gap-2 rounded-xl bg-muted p-2 text-sm">
                  <span className="font-bold tabular-nums">
                    {formatTime(l.start_time)}–{formatTime(l.end_time)}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {l.classes?.grade_name} · {l.schools?.name}
                  </span>
                  <StatusBadge status={l.status} />
                </li>
              ))}
            </ul>
          )}
          <Link href="/admin/calendario" className="mt-auto min-h-11 content-center font-semibold text-primary">
            Apri il calendario →
          </Link>
        </section>
      </div>
    </div>
  );
}
