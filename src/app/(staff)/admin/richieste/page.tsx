import { CalendarSearch, Check, Undo2 } from "lucide-react";
import Link from "next/link";

import { NotificationsToggle } from "@/components/notifications-toggle";
import { getOpenRequests } from "@/lib/admin-stats";
import { formatCompact, formatDay, formatTime } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import { setRequestHandled } from "./actions";

const dateTime = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export default async function RequestsPage() {
  const supabase = await createClient();
  const [open, { data: handled }] = await Promise.all([
    getOpenRequests(),
    supabase
      .from("change_requests")
      .select("id, teacher_name, message, handled_at, schools(name), lessons(date, start_time, classes(grade_name))")
      .not("handled_at", "is", null)
      .order("handled_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-2xl font-bold">Richieste di spostamento</h1>
        <NotificationsToggle />
      </div>

      {open.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-muted-foreground">
          Nessuna richiesta da gestire ✓
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {open.map((r) => (
            <li key={r.id} className="rounded-2xl border-2 border-coral bg-card p-4">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-lg font-bold">
                  {r.schools?.name} · Classe {r.lessons?.classes?.grade_name}
                </p>
                <span className="text-sm text-muted-foreground">{dateTime.format(new Date(r.created_at))}</span>
              </div>
              {r.lessons && (
                <p className="font-semibold first-letter:uppercase text-primary">
                  Lezione di {formatDay(r.lessons.date)}, {formatTime(r.lessons.start_time)}–{formatTime(r.lessons.end_time)}
                </p>
              )}
              <blockquote className="my-3 rounded-xl bg-muted p-3 whitespace-pre-wrap">
                {r.message}
                <footer className="mt-1 text-sm font-semibold">— {r.teacher_name}</footer>
              </blockquote>
              {(r.proposed_date || r.proposed_time) && (
                <p className="mb-3 font-medium">
                  Proposta:{" "}
                  <span className="rounded-full bg-sun px-3 py-0.5 font-bold first-letter:uppercase">
                    {r.proposed_date ? formatCompact(r.proposed_date) : ""}
                    {r.proposed_time ? ` · ${formatTime(r.proposed_time)}` : ""}
                  </span>
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {r.lessons && (
                  <Link
                    href={`/admin/calendario?data=${r.lessons.date}&lezione=${r.lessons.id}`}
                    className="flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-foreground"
                  >
                    <CalendarSearch className="size-5" aria-hidden /> Apri nel calendario
                  </Link>
                )}
                <form action={setRequestHandled.bind(null, r.id, true)}>
                  <button
                    type="submit"
                    className="flex min-h-11 items-center gap-2 rounded-xl border-2 px-4 font-semibold"
                  >
                    <Check className="size-5" aria-hidden /> Segna come gestita
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}

      {!!handled?.length && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-bold">Gestite di recente</h2>
          <ul className="flex flex-col gap-2">
            {handled.map((r) => (
              <li key={r.id} className="flex items-center gap-3 rounded-2xl border bg-card p-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">
                    {r.schools?.name} · {r.lessons?.classes?.grade_name} ·{" "}
                    <span className="first-letter:uppercase">{r.lessons ? formatCompact(r.lessons.date) : ""}</span>
                  </p>
                  <p className="truncate text-muted-foreground">
                    {r.teacher_name}: {r.message}
                  </p>
                </div>
                <form action={setRequestHandled.bind(null, r.id, false)}>
                  <button
                    type="submit"
                    className="flex min-h-11 items-center gap-1 rounded-xl px-3 font-medium text-primary"
                    aria-label="Riapri la richiesta"
                  >
                    <Undo2 className="size-4" aria-hidden /> Riapri
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
