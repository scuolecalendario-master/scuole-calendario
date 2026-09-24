import "server-only";

import { SCHOOL_COLORS, type CalendarPerson, type CalendarSchool } from "@/components/calendar/types";
import { createClient } from "@/lib/supabase/server";

/** Colore stabile per scuola: non cambia quando se ne aggiungono o tolgono altre. */
function schoolColor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return SCHOOL_COLORS[hash % SCHOOL_COLORS.length];
}

/** Scuole (con classi e colore) e personale per filtri e form del calendario. */
export async function getCalendarData() {
  const supabase = await createClient();
  const [{ data: schools }, { data: staff }] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, classes(id, grade_name, total_enrolled)")
      .order("name")
      .order("grade_name", { referencedTable: "classes" }),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .not("role", "is", null)
      .order("full_name"),
  ]);

  return {
    schools: (schools ?? []).map<CalendarSchool>((s) => ({ ...s, color: schoolColor(s.id) })),
    instructors: (staff ?? []).map<CalendarPerson>((p) => ({
      id: p.id,
      name: p.full_name ?? p.email ?? "Senza nome",
    })),
  };
}
