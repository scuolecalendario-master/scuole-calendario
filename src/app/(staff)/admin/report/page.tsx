import { CalendarCheck, Download, Percent, Target, Users } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LEVEL_STYLE } from "@/lib/colors";
import { addDays, formatDate, startOfSchoolYear, todayISO } from "@/lib/dates";
import { focusLabel, LEVEL_LABEL, LEVELS } from "@/lib/focus";
import {
  formatNumber,
  formatPercent,
  getFocusReport,
  getReport,
  getSchoolOptions,
  parseReportFilters,
  type ReportTotals,
  type SchoolReport,
} from "@/lib/report";
import { cn } from "@/lib/utils";

export default async function ReportPage({ searchParams }: PageProps<"/admin/report">) {
  const filters = parseReportFilters(await searchParams);
  const [schoolOptions, { schools, overall }, focusRows] = await Promise.all([
    getSchoolOptions(),
    getReport(filters),
    getFocusReport(filters),
  ]);

  const today = todayISO();
  const selected = filters.schoolId ? schools[0] : null;
  const link = (params: { dal: string; al: string; scuola?: string | null }) => {
    const q = new URLSearchParams({ dal: params.dal, al: params.al });
    if (params.scuola) q.set("scuola", params.scuola);
    return `/admin/report?${q}`;
  };
  const exportHref = (tipo: "riepilogo" | "lezioni" | "focus") => {
    const q = new URLSearchParams({ dal: filters.from, al: filters.to, tipo });
    if (filters.schoolId) q.set("scuola", filters.schoolId);
    return `/admin/report/export?${q}`;
  };
  const presets = [
    { label: "Questo mese", dal: `${today.slice(0, 7)}-01`, al: today },
    { label: "Ultimi 30 giorni", dal: addDays(today, -29), al: today },
    { label: "Anno scolastico", dal: startOfSchoolYear(today), al: today },
  ];

  // Focus per livello, con il massimo per scalare le barre
  const focusByLevel = LEVELS.map((l) => ({
    level: l.id,
    rows: focusRows.filter((r) => r.level === l.id),
  })).filter((g) => g.rows.length > 0);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Report</h1>
        <p className="text-muted-foreground">
          {selected?.schoolName ?? "Tutti gli istituti"} · dal {formatDate(filters.from)} al {formatDate(filters.to)}
        </p>
      </div>

      {/* Filtri */}
      <section className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4">
        <div className="flex flex-wrap gap-2" aria-label="Periodi rapidi">
          {presets.map((p) => {
            const active = p.dal === filters.from && p.al === filters.to;
            return (
              <Link
                key={p.label}
                href={link({ ...p, scuola: filters.schoolId })}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "flex min-h-11 items-center rounded-full border-2 px-4 text-sm font-semibold",
                  active ? "border-primary bg-primary text-primary-foreground" : "border-border",
                )}
              >
                {p.label}
              </Link>
            );
          })}
        </div>
        <form className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="scuola">Istituto</Label>
            <NativeSelect id="scuola" name="scuola" defaultValue={filters.schoolId ?? ""} className="h-11 text-base">
              <option value="">Tutti gli istituti</option>
              {schoolOptions.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dal">Dal</Label>
            <Input id="dal" name="dal" type="date" defaultValue={filters.from} required className="h-11 text-base" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="al">Al</Label>
            <Input id="al" name="al" type="date" defaultValue={filters.to} required className="h-11 text-base" />
          </div>
          <Button type="submit" className="h-11 px-6">
            Applica
          </Button>
        </form>
      </section>

      {/* Indicatori */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={CalendarCheck}
          tone="bg-done text-white"
          label="Lezioni svolte"
          value={formatNumber(overall.lessonsDone)}
          hint={`su ${formatNumber(overall.lessonsTotal)} · ${formatNumber(overall.lessonsCancelled)} annullate`}
        />
        <Kpi icon={Users} tone="bg-primary text-white" label="Iscritti" value={formatNumber(overall.enrolled)} />
        <Kpi
          icon={Target}
          tone="bg-turquoise text-foreground"
          label="Presenze"
          value={formatNumber(overall.attendees)}
          hint={`media ${formatNumber(overall.avgAttendees)} a lezione`}
        />
        <Kpi
          icon={Percent}
          tone="bg-sun text-foreground"
          label="Frequenza"
          value={formatPercent(overall.attendanceRate)}
          bar={overall.attendanceRate}
        />
      </div>

      {/* Dettaglio */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">{selected ? "Classi per plesso" : "Istituti"}</h2>
        {schools.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed p-8 text-center text-muted-foreground">
            Nessun dato per il periodo scelto.
          </p>
        ) : selected ? (
          <SchoolDetail school={selected} />
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {schools.map((s) => (
              <li key={s.schoolId}>
                <Link
                  href={link({ dal: filters.from, al: filters.to, scuola: s.schoolId })}
                  className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4 hover:border-primary"
                >
                  <span className="text-lg font-bold">{s.schoolName}</span>
                  <TotalsLine t={s} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Focus */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Focus lavorati</h2>
        {focusByLevel.length === 0 ? (
          <p className="rounded-2xl border-2 border-dashed p-6 text-center text-muted-foreground">
            Nessun focus registrato nelle lezioni svolte del periodo.
          </p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {focusByLevel.map((g) => {
              const max = Math.max(...g.rows.map((r) => r.lessons));
              return (
                <div key={g.level} className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-4">
                  <span className={cn("self-start rounded-full px-3 py-0.5 text-sm font-bold", LEVEL_STYLE[g.level].solid)}>
                    {LEVEL_LABEL[g.level]}
                  </span>
                  <ul className="flex flex-col gap-1.5">
                    {g.rows.map((r) => (
                      <li key={r.focus} className="grid grid-cols-[1fr_auto] items-center gap-x-3 text-sm">
                        <span className="font-medium">{focusLabel(r.focus)}</span>
                        <span className="font-bold tabular-nums">{r.lessons}</span>
                        <span className="col-span-2 h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
                          <span
                            className={cn("block h-full rounded-full", LEVEL_STYLE[g.level].solid)}
                            style={{ width: `${(r.lessons / max) * 100}%` }}
                          />
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Export */}
      <section className="flex flex-wrap items-center gap-2 rounded-3xl border-2 bg-card p-4">
        <span className="mr-2 font-bold">Esporta per Excel</span>
        {(
          [
            ["riepilogo", "Riepilogo classi"],
            ["lezioni", "Tutte le lezioni"],
            ["focus", "Focus"],
          ] as const
        ).map(([tipo, label]) => (
          <Link
            key={tipo}
            href={exportHref(tipo)}
            prefetch={false}
            className="flex min-h-11 items-center gap-2 rounded-xl border-2 px-4 font-semibold"
          >
            <Download className="size-4" aria-hidden /> {label}
          </Link>
        ))}
      </section>
    </div>
  );
}

function Kpi({
  icon: Icon,
  tone,
  label,
  value,
  hint,
  bar,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  label: string;
  value: string;
  hint?: string;
  bar?: number | null;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-3xl border-2 bg-card p-4">
      <span className={cn("flex size-10 items-center justify-center rounded-xl", tone)}>
        <Icon className="size-5" />
      </span>
      <span className="mt-1 text-sm font-semibold text-muted-foreground">{label}</span>
      <span className="text-3xl font-bold tabular-nums">{value}</span>
      {hint && <span className="text-sm text-muted-foreground">{hint}</span>}
      {bar != null && (
        <span className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted" aria-hidden>
          <span className="block h-full rounded-full bg-done" style={{ width: `${Math.min(bar, 1) * 100}%` }} />
        </span>
      )}
    </div>
  );
}

function TotalsLine({ t }: { t: ReportTotals }) {
  return (
    <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      <span>
        <b className="tabular-nums">{formatNumber(t.lessonsDone)}</b>/{formatNumber(t.lessonsTotal)} svolte
      </span>
      <span>
        <b className="tabular-nums">{formatNumber(t.attendees)}</b> presenze
      </span>
      <span>
        frequenza <b className="tabular-nums">{formatPercent(t.attendanceRate)}</b>
      </span>
      {t.lessonsCancelled > 0 && <span className="text-cancelled-text">{t.lessonsCancelled} annullate</span>}
    </span>
  );
}

function SchoolDetail({ school }: { school: SchoolReport }) {
  const bySite = Map.groupBy(school.classes, (c) => c.siteName ?? "Senza plesso");
  return (
    <div className="flex flex-col gap-4">
      {[...bySite].map(([site, classes]) => (
        <div key={site} className="flex flex-col gap-2">
          {(bySite.size > 1 || site !== "Senza plesso") && <h3 className="font-bold text-primary">{site}</h3>}
          <ul className="grid gap-2 md:grid-cols-2">
            {classes.map((c) => (
              <li key={c.classId} className="flex flex-col gap-2 rounded-2xl border-2 bg-card p-3">
                <span className="flex items-center gap-2">
                  <span className="text-lg font-bold">Classe {c.gradeName}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", LEVEL_STYLE[c.level].solid)}>
                    {LEVEL_LABEL[c.level]}
                  </span>
                  <span className="ml-auto text-sm text-muted-foreground">{c.enrolled} iscritti</span>
                </span>
                <TotalsLine t={c} />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
