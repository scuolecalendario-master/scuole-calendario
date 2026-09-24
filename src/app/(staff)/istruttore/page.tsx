import { StatusBadge } from "@/components/lessons/status-badge";
import { formatDay, formatTime, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

// Vista del giorno per gli istruttori. La registrazione di stato e presenze
// (fase 5 della roadmap) si aggancerà a questa lista.
export default async function InstructorTodayPage() {
  const today = todayISO();
  const supabase = await createClient();
  const { data: lessons } = await supabase
    .from("lessons")
    .select("id, start_time, end_time, status, attendees_count, schools(name), classes(grade_name, total_enrolled)")
    .eq("date", today)
    .order("start_time");

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4">
      <h1 className="text-xl font-bold capitalize">{formatDay(today)}</h1>
      {!lessons?.length ? (
        <p className="py-12 text-center text-muted-foreground">Nessuna lezione oggi.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {lessons.map((l) => (
            <li key={l.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-lg font-semibold tabular-nums">
                  {formatTime(l.start_time)}–{formatTime(l.end_time)}
                </span>
                <StatusBadge status={l.status} />
              </div>
              <p className="mt-1">
                {l.schools?.name} · Classe {l.classes?.grade_name}
              </p>
              <p className="text-sm text-muted-foreground tabular-nums">
                {l.attendees_count ?? "—"} / {l.classes?.total_enrolled} presenti
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
