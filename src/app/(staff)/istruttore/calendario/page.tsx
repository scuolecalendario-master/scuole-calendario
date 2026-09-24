import { LessonCalendarLoader } from "@/components/calendar/lesson-calendar-loader";
import { requireRole } from "@/lib/auth";
import { getCalendarData } from "@/lib/calendar-data";

export default async function InstructorCalendarPage() {
  const me = await requireRole("instructor", "master");
  const { schools, instructors } = await getCalendarData();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">Calendario generale</h1>
      <LessonCalendarLoader
        editable={false}
        schools={schools}
        instructors={instructors}
        currentUserId={me.id}
      />
    </div>
  );
}
