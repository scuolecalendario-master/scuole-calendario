import Link from "next/link";

import { LessonCalendarLoader } from "@/components/calendar/lesson-calendar-loader";
import { requireRole } from "@/lib/auth";
import { getCalendarData } from "@/lib/calendar-data";
import { isISODate } from "@/lib/dates";

export default async function AdminCalendarPage({ searchParams }: PageProps<"/admin/calendario">) {
  const me = await requireRole("master");
  // Link da richieste e dashboard: ?data=YYYY-MM-DD&lezione=<id>
  const { data, lezione } = await searchParams;
  const { schools, instructors } = await getCalendarData();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Calendario</h1>
      {schools.every((s) => s.classes.length === 0) ? (
        <p className="text-muted-foreground">
          Per programmare le lezioni crea prima un istituto con almeno una classe in{" "}
          <Link href="/admin/scuole" className="underline underline-offset-4">
            Istituti
          </Link>
          .
        </p>
      ) : (
        <LessonCalendarLoader
          // Nuovo link "Apri nel calendario" → calendario rimontato sulla nuova lezione
          key={typeof lezione === "string" ? lezione : "calendario"}
          editable
          schools={schools}
          instructors={instructors}
          currentUserId={me.id}
          initialDate={isISODate(data) ? data : undefined}
          openLessonId={typeof lezione === "string" && /^[0-9a-f-]{36}$/i.test(lezione) ? lezione : undefined}
        />
      )}
    </div>
  );
}
