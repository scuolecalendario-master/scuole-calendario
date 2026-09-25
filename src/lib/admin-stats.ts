import "server-only";

import { cache } from "react";

import { nowTimeRome, startOfSchoolYear, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";

/** Filtro PostgREST: lezioni già finite (ieri o prima, oppure oggi con orario concluso). */
function endedFilter() {
  const today = todayISO();
  return `date.lt.${today},and(date.eq.${today},end_time.lte.${nowTimeRome()})`;
}

/** Contatori per i badge del menu master (deduplicati per richiesta). */
export const getAdminCounts = cache(async () => {
  const supabase = await createClient();
  const [requests, toRecord] = await Promise.all([
    supabase.from("change_requests").select("id", { count: "exact", head: true }).is("handled_at", null),
    supabase
      .from("lessons")
      .select("id", { count: "exact", head: true })
      .eq("status", "scheduled")
      .gte("date", startOfSchoolYear(todayISO()))
      .or(endedFilter()),
  ]);
  return { openRequests: requests.count ?? 0, toRecord: toRecord.count ?? 0 };
});

/** Lezioni finite ma non registrate, con gli istruttori della classe. */
export async function getLessonsToRecord(limit = 200) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select(
      "id, date, start_time, end_time, instructor_id, schools(name), classes(grade_name, class_instructors(profiles(id, full_name, email)))",
    )
    .eq("status", "scheduled")
    .gte("date", startOfSchoolYear(todayISO()))
    .or(endedFilter())
    .order("date", { ascending: false })
    .order("start_time")
    .limit(limit);
  return data ?? [];
}

export async function getOpenRequests(limit = 100) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("change_requests")
    .select(
      "id, teacher_name, message, proposed_date, proposed_time, created_at, schools(name), lessons(id, date, start_time, end_time, classes(grade_name))",
    )
    .is("handled_at", null)
    .order("created_at", { ascending: false })
    .limit(limit);
  return data ?? [];
}
