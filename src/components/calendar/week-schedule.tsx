import { StatusBadge, type LessonStatus } from "@/components/lessons/status-badge";
import { addDays, formatDay, formatTime, todayISO } from "@/lib/dates";
import { cn } from "@/lib/utils";

export type ScheduleLesson = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: LessonStatus;
  attendees_count: number | null;
  classes: { grade_name: string; total_enrolled: number } | null;
};

/**
 * Settimana lun–ven (sab/dom solo se hanno lezioni).
 * Su mobile i giorni sono impilati, da tablet in su affiancati.
 */
export function WeekSchedule({
  weekStart,
  lessons,
}: {
  weekStart: string;
  lessons: ScheduleLesson[];
}) {
  const today = todayISO();
  const byDate = Map.groupBy(lessons, (l) => l.date);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).filter(
    (d, i) => i < 5 || byDate.has(d),
  );

  return (
    <div
      className={cn(
        "grid gap-3",
        days.length > 5 ? "md:grid-cols-6 lg:grid-cols-7" : "md:grid-cols-5",
      )}
    >
      {days.map((date) => {
        const items = byDate.get(date) ?? [];
        return (
          <section
            key={date}
            className={cn(
              "rounded-xl border bg-card p-3",
              date === today && "border-primary ring-1 ring-primary",
            )}
          >
            <h2 className="mb-2 text-sm font-semibold capitalize">
              {formatDay(date)}
              {date === today && (
                <span className="ml-1 font-normal text-muted-foreground">· oggi</span>
              )}
            </h2>
            {items.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nessuna lezione</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {items.map((l) => (
                  <li
                    key={l.id}
                    className={cn(
                      "rounded-lg bg-muted/50 p-2 text-sm",
                      l.status === "cancelled" && "opacity-60",
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium tabular-nums">
                        {formatTime(l.start_time)}–{formatTime(l.end_time)}
                      </span>
                      <StatusBadge status={l.status} />
                    </div>
                    <div className="mt-1 text-muted-foreground">
                      Classe {l.classes?.grade_name ?? "—"}
                      {l.status === "done" && l.attendees_count != null && l.classes && (
                        <span className="tabular-nums">
                          {" "}
                          · {l.attendees_count}/{l.classes.total_enrolled} presenti
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
