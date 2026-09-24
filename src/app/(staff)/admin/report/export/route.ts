import type { NextRequest } from "next/server";

import { STATUS_LABEL } from "@/components/lessons/status-badge";
import { getCurrentProfile } from "@/lib/auth";
import { csvResponse, toCSV } from "@/lib/csv";
import { formatDate, formatTime } from "@/lib/dates";
import { getReport, parseReportFilters, type ReportFilters } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "master") {
    return new Response("Non autorizzato", { status: 403 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const filters = parseReportFilters(params);
  const suffix = `${filters.from}_${filters.to}`;

  if (params.tipo === "lezioni") {
    return csvResponse(await lessonsCSV(filters), `lezioni_${suffix}.csv`);
  }
  return csvResponse(await summaryCSV(filters), `report_${suffix}.csv`);
}

/** Una riga per classe con gli indicatori aggregati. */
async function summaryCSV(filters: ReportFilters) {
  const { schools } = await getReport(filters);
  return toCSV(
    [
      "Scuola", "Classe", "Iscritti", "Lezioni pianificate", "Svolte", "Annullate",
      "Da svolgere", "Presenze totali", "Media presenti per lezione", "Frequenza %",
    ],
    schools.flatMap((s) =>
      s.classes.map((c) => [
        s.schoolName, c.gradeName, c.enrolled, c.lessonsTotal, c.lessonsDone,
        c.lessonsCancelled, c.lessonsScheduled, c.attendees, c.avgAttendees,
        c.attendanceRate == null ? null : c.attendanceRate * 100,
      ]),
    ),
  );
}

/** Elenco completo delle lezioni nel periodo (paginato: PostgREST limita a 1000 righe). */
async function lessonsCSV(filters: ReportFilters) {
  const supabase = await createClient();
  const PAGE = 1000;
  const rows = [];

  for (let offset = 0; ; offset += PAGE) {
    let query = supabase
      .from("lessons")
      .select(
        "date, start_time, end_time, status, attendees_count, notes, schools(name), classes(grade_name, total_enrolled), profiles(full_name, email)",
      )
      .gte("date", filters.from)
      .lte("date", filters.to)
      .order("date")
      .order("start_time")
      .order("id")
      .range(offset, offset + PAGE - 1);
    if (filters.schoolId) query = query.eq("school_id", filters.schoolId);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    rows.push(...data);
    if (data.length < PAGE) break;
  }

  return toCSV(
    ["Data", "Inizio", "Fine", "Scuola", "Classe", "Iscritti", "Stato", "Presenti", "Istruttore", "Note"],
    rows.map((l) => [
      formatDate(l.date),
      formatTime(l.start_time),
      formatTime(l.end_time),
      l.schools?.name,
      l.classes?.grade_name,
      l.classes?.total_enrolled,
      STATUS_LABEL[l.status],
      l.attendees_count,
      l.profiles?.full_name ?? l.profiles?.email,
      l.notes,
    ]),
  );
}
