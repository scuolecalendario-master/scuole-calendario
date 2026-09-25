import type { NextRequest } from "next/server";

import { STATUS_LABEL } from "@/components/lessons/status-badge";
import { getCurrentProfile } from "@/lib/auth";
import { csvResponse, toCSV } from "@/lib/csv";
import { formatDate, formatTime } from "@/lib/dates";
import { focusLabel, LEVEL_LABEL } from "@/lib/focus";
import { getFocusReport, getReport, parseReportFilters, type ReportFilters } from "@/lib/report";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "master") {
    return new Response("Non autorizzato", { status: 403 });
  }

  const params = Object.fromEntries(request.nextUrl.searchParams);
  const filters = parseReportFilters(params);
  const suffix = `${filters.from}_${filters.to}`;

  if (params.tipo === "focus") {
    return csvResponse(await focusCSV(filters), `focus_${suffix}.csv`);
  }
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
      "Istituto", "Plesso", "Classe", "Livello", "Iscritti", "Lezioni pianificate", "Svolte", "Annullate",
      "Da svolgere", "Presenze totali", "Media presenti per lezione", "Frequenza %",
    ],
    schools.flatMap((s) =>
      s.classes.map((c) => [
        s.schoolName, c.siteName, c.gradeName, LEVEL_LABEL[c.level], c.enrolled, c.lessonsTotal, c.lessonsDone,
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
        "date, start_time, end_time, status, attendees_count, focus, focus_note, notes, schools(name), classes(grade_name, total_enrolled, level, sites(name)), profiles(full_name, email)",
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
    ["Data", "Inizio", "Fine", "Istituto", "Plesso", "Classe", "Livello", "Iscritti", "Stato", "Presenti", "Focus", "Istruttore", "Note"],
    rows.map((l) => [
      formatDate(l.date),
      formatTime(l.start_time),
      formatTime(l.end_time),
      l.schools?.name,
      l.classes?.sites?.name,
      l.classes?.grade_name,
      l.classes ? LEVEL_LABEL[l.classes.level] : null,
      l.classes?.total_enrolled,
      STATUS_LABEL[l.status],
      l.attendees_count,
      l.focus.map((id) => focusLabel(id, l.focus_note)).join(", "),
      l.profiles?.full_name ?? l.profiles?.email,
      l.notes,
    ]),
  );
}

/** Quante lezioni svolte hanno lavorato ciascun focus, per livello. */
async function focusCSV(filters: ReportFilters) {
  const rows = await getFocusReport(filters);
  return toCSV(
    ["Livello", "Focus", "Lezioni svolte"],
    rows.map((r) => [LEVEL_LABEL[r.level], focusLabel(r.focus), r.lessons]),
  );
}
