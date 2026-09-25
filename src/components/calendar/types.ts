import type { Enums } from "@/types/database";

export type CalendarSchool = {
  id: string;
  name: string;
  color: string;
  classes: { id: string; grade_name: string; total_enrolled: number }[];
};

export type CalendarPerson = { id: string; name: string };

/** Lezione come letta dal calendario (join con classe e scuola). */
export type CalendarLesson = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  status: Enums<"lesson_status">;
  attendees_count: number | null;
  notes: string | null;
  class_id: string;
  school_id: string;
  instructor_id: string | null;
  classes: { grade_name: string; total_enrolled: number } | null;
  schools: { name: string } | null;
};

/** Dati per aprire il dialog: lezione esistente o nuova (con data/ora proposte). */
export type DialogTarget =
  | { mode: "edit"; lesson: CalendarLesson }
  | { mode: "create"; date: string; startTime: string; endTime: string };

