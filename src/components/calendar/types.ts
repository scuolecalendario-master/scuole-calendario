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

// Colori distinguibili (anche in dark mode) per le scuole, assegnati in ordine alfabetico.
export const SCHOOL_COLORS = [
  "#2563eb", "#16a34a", "#d97706", "#9333ea", "#dc2626",
  "#0891b2", "#db2777", "#65a30d", "#7c3aed", "#ea580c",
];
