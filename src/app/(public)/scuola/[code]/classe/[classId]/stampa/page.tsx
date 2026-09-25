import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { STATUS_LABEL } from "@/components/lessons/status-badge";
import { addDays, formatDay, formatMonth, formatTime, startOfSchoolYear, todayISO } from "@/lib/dates";
import { focusLabel, LEVEL_LABEL } from "@/lib/focus";
import { getPortalSchool, UUID } from "@/lib/portal";
import { AutoPrint } from "./auto-print";

export const metadata: Metadata = { title: "Calendario da stampare", robots: { index: false, follow: false } };

/** Calendario completo della classe, pensato per la carta (DESIGN.md §7). */
export default async function PrintClassPage({ params }: PageProps<"/scuola/[code]/classe/[classId]/stampa">) {
  const { code: rawCode, classId } = await params;
  if (!UUID.test(classId)) notFound();
  const { code, school, supabase } = await getPortalSchool(rawCode);

  const yearStart = startOfSchoolYear(todayISO());
  const [{ data: cls }, { data: lessons }] = await Promise.all([
    supabase.from("classes").select("id, grade_name, level, sites(name)").eq("id", classId).maybeSingle(),
    supabase
      .from("lessons")
      .select("id, date, start_time, end_time, status, focus, focus_note")
      .eq("class_id", classId)
      .gte("date", yearStart)
      .lt("date", addDays(yearStart, 366))
      .order("date")
      .order("start_time"),
  ]);
  if (!cls) notFound();

  const byMonth = Map.groupBy(lessons ?? [], (l) => formatMonth(l.date));
  const schoolYear = `${yearStart.slice(0, 4)}/${Number(yearStart.slice(0, 4)) + 1}`;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 bg-white px-4 py-6 text-black print:max-w-none print:p-0">
      <div className="mb-4 flex items-center justify-between gap-2 print:hidden">
        <Link href={`/scuola/${code}/classe/${cls.id}`} className="min-h-11 font-semibold text-primary">
          ← Torna alla classe
        </Link>
        <AutoPrint />
      </div>

      <header className="mb-4 border-b-2 border-black pb-2">
        <h1 className="text-2xl font-bold">
          Lezioni di nuoto · Classe {cls.grade_name} ({LEVEL_LABEL[cls.level]})
        </h1>
        <p>
          {school.name}
          {cls.sites?.name ? ` · ${cls.sites.name}` : ""} · Anno scolastico {schoolYear}
        </p>
      </header>

      {byMonth.size === 0 ? (
        <p>Nessuna lezione in programma.</p>
      ) : (
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b-2 border-black text-left">
              <th className="py-1 pr-2">Data</th>
              <th className="py-1 pr-2">Orario</th>
              <th className="py-1 pr-2">Stato</th>
              <th className="py-1">Focus</th>
            </tr>
          </thead>
          <tbody>
            {[...byMonth].map(([month, items]) => (
              <MonthRows key={month} month={month} items={items} />
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}

function MonthRows({
  month,
  items,
}: {
  month: string;
  items: { id: string; date: string; start_time: string; end_time: string; status: keyof typeof STATUS_LABEL; focus: string[]; focus_note: string | null }[];
}) {
  return (
    <>
      <tr className="break-inside-avoid">
        <td colSpan={4} className="pt-3 pb-1 font-bold first-letter:uppercase">
          {month}
        </td>
      </tr>
      {items.map((l) => (
        <tr key={l.id} className="break-inside-avoid border-b border-gray-400">
          <td className={`py-1 pr-2 first-letter:uppercase ${l.status === "cancelled" ? "line-through" : ""}`}>{formatDay(l.date)}</td>
          <td className="py-1 pr-2 tabular-nums">
            {formatTime(l.start_time)}–{formatTime(l.end_time)}
          </td>
          <td className="py-1 pr-2">{l.status === "scheduled" ? "" : STATUS_LABEL[l.status]}</td>
          <td className="py-1">{l.focus.map((f) => focusLabel(f, l.focus_note)).join(", ")}</td>
        </tr>
      ))}
    </>
  );
}
