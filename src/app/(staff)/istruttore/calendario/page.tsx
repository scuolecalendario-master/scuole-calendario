import { LessonCalendarLoader } from "@/components/calendar/lesson-calendar-loader";
import { requireRole } from "@/lib/auth";
import { getCalendarData } from "@/lib/calendar-data";

export default async function InstructorCalendarPage() {
  const me = await requireRole("instructor", "master");
  const { schools, instructors } = await getCalendarData();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{me.role === "master" ? "Calendario generale" : "Il mio calendario"}</h1>
      {/* La RLS mostra agli istruttori solo gli istituti delle loro classi (e le supplenze) */}
      {schools.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-8 text-center text-muted-foreground">
          Non hai ancora classi assegnate: chiedi all&apos;amministratore di assegnartele.
        </p>
      ) : (
        <LessonCalendarLoader
          editable={false}
          schools={schools}
          instructors={instructors}
          currentUserId={me.id}
        />
      )}
    </div>
  );
}
