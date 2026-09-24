import Link from "next/link";

import { LessonCalendarLoader } from "@/components/calendar/lesson-calendar-loader";
import { requireRole } from "@/lib/auth";
import { getCalendarData } from "@/lib/calendar-data";

export default async function AdminCalendarPage() {
  const me = await requireRole("master");
  const { schools, instructors } = await getCalendarData();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Calendario</h1>
      {schools.every((s) => s.classes.length === 0) ? (
        <p className="text-muted-foreground">
          Per programmare le lezioni crea prima una scuola con almeno una classe in{" "}
          <Link href="/admin/scuole" className="underline underline-offset-4">
            Scuole
          </Link>
          .
        </p>
      ) : (
        <LessonCalendarLoader
          editable
          schools={schools}
          instructors={instructors}
          currentUserId={me.id}
        />
      )}
    </div>
  );
}
