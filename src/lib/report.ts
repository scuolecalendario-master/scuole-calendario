import "server-only";

import { isISODate, startOfSchoolYear, todayISO } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Database, Enums } from "@/types/database";

export type ClassReportRow =
  Database["public"]["Functions"]["lesson_report"]["Returns"][number];

export type ReportTotals = {
  lessonsTotal: number;
  lessonsDone: number;
  lessonsCancelled: number;
  lessonsScheduled: number;
  enrolled: number;
  attendees: number;
  /** Media presenti per lezione svolta */
  avgAttendees: number | null;
  /** Presenze effettive / presenze attese (iscritti × lezioni svolte) */
  attendanceRate: number | null;
};

export type SchoolReport = ReportTotals & {
  schoolId: string;
  schoolName: string;
  classes: (ReportTotals & {
    classId: string;
    gradeName: string;
    siteName: string | null;
    level: Enums<"school_level">;
  })[];
};

export type ReportFilters = { from: string; to: string; schoolId: string | null };

/** Legge i filtri da searchParams; default: inizio anno scolastico → oggi. */
export function parseReportFilters(params: Record<string, string | string[] | undefined>) {
  const today = todayISO();
  const from = isISODate(params.dal) ? params.dal : startOfSchoolYear(today);
  const to = isISODate(params.al) ? params.al : today;
  const schoolId =
    typeof params.scuola === "string" && /^[0-9a-f-]{36}$/i.test(params.scuola)
      ? params.scuola
      : null;
  return from <= to ? { from, to, schoolId } : { from: to, to: from, schoolId };
}

function totals(rows: ClassReportRow[]): ReportTotals {
  const sum = (key: keyof ClassReportRow) =>
    rows.reduce((acc, r) => acc + Number(r[key] ?? 0), 0);
  const done = sum("lessons_done");
  const attendees = sum("attendees_total");
  const expected = sum("expected_total");
  return {
    lessonsTotal: sum("lessons_total"),
    lessonsDone: done,
    lessonsCancelled: sum("lessons_cancelled"),
    lessonsScheduled: sum("lessons_scheduled"),
    enrolled: sum("total_enrolled"),
    attendees,
    avgAttendees: done > 0 ? attendees / done : null,
    attendanceRate: expected > 0 ? attendees / expected : null,
  };
}

export async function getReport(filters: ReportFilters) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("lesson_report", {
    p_from: filters.from,
    p_to: filters.to,
    ...(filters.schoolId ? { p_school_id: filters.schoolId } : {}),
  });
  if (error) throw new Error(`Report non disponibile: ${error.message}`);

  const bySchool = Map.groupBy(data, (r) => r.school_id);
  const schools: SchoolReport[] = [...bySchool].map(([schoolId, rows]) => ({
    schoolId,
    schoolName: rows[0].school_name,
    ...totals(rows),
    classes: rows.map((r) => ({
      classId: r.class_id,
      gradeName: r.grade_name,
      siteName: r.site_name,
      level: r.level,
      ...totals([r]),
    })),
  }));

  return { schools, overall: totals(data) };
}

/** Focus lavorati nelle lezioni svolte del periodo, per livello (più frequenti prima). */
export async function getFocusReport(filters: ReportFilters) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("focus_report", {
    p_from: filters.from,
    p_to: filters.to,
    ...(filters.schoolId ? { p_school_id: filters.schoolId } : {}),
  });
  if (error) throw new Error(`Report focus non disponibile: ${error.message}`);
  return data;
}

export async function getSchoolOptions() {
  const supabase = await createClient();
  const { data } = await supabase.from("schools").select("id, name").order("name");
  return data ?? [];
}

const numberFormat = new Intl.NumberFormat("it-IT", { maximumFractionDigits: 1 });
const percentFormat = new Intl.NumberFormat("it-IT", {
  style: "percent",
  maximumFractionDigits: 1,
});

export const formatNumber = (n: number | null) => (n == null ? "—" : numberFormat.format(n));
export const formatPercent = (n: number | null) => (n == null ? "—" : percentFormat.format(n));
