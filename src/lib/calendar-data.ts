import "server-only";

import type { CalendarPerson, CalendarSchool } from "@/components/calendar/types";
import { schoolColor } from "@/lib/colors";
import { createClient } from "@/lib/supabase/server";

/** Scuole (con classi e colore) e personale per filtri e form del calendario. */
export async function getCalendarData() {
  const supabase = await createClient();
  const [{ data: schools }, { data: staff }] = await Promise.all([
    supabase
      .from("schools")
      .select("id, name, sites(id, name), classes(id, grade_name, total_enrolled, site_id, class_instructors(profile_id))")
      .order("name")
      .order("grade_name", { referencedTable: "classes" })
      .order("name", { referencedTable: "sites" }),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .not("role", "is", null)
      .order("full_name"),
  ]);

  return {
    schools: (schools ?? []).map<CalendarSchool>((s) => ({
      ...s,
      color: schoolColor(s.id),
      classes: s.classes.map(({ class_instructors, ...c }) => ({
        ...c,
        instructorIds: class_instructors.map((ci) => ci.profile_id),
      })),
    })),
    instructors: (staff ?? []).map<CalendarPerson>((p) => ({
      id: p.id,
      name: p.full_name ?? p.email ?? "Senza nome",
    })),
  };
}
