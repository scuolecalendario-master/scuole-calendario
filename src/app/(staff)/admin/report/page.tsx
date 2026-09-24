import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/dates";
import {
  formatNumber,
  formatPercent,
  getReport,
  getSchoolOptions,
  parseReportFilters,
  type ReportTotals,
} from "@/lib/report";

export default async function ReportPage({ searchParams }: PageProps<"/admin/report">) {
  const filters = parseReportFilters(await searchParams);
  const [schoolOptions, { schools, overall }] = await Promise.all([
    getSchoolOptions(),
    getReport(filters),
  ]);

  const selected = filters.schoolId ? schools[0] : null;
  const exportHref = (tipo: "riepilogo" | "lezioni") => {
    const q = new URLSearchParams({ dal: filters.from, al: filters.to, tipo });
    if (filters.schoolId) q.set("scuola", filters.schoolId);
    return `/admin/report/export?${q}`;
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Reportistica</h1>
        <p className="text-sm text-muted-foreground">
          {selected?.schoolName ?? "Tutte le scuole"} · dal {formatDate(filters.from)} al{" "}
          {formatDate(filters.to)}
        </p>
      </div>

      <form className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="scuola">Scuola</Label>
          <NativeSelect id="scuola" name="scuola" defaultValue={filters.schoolId ?? ""}>
            <option value="">Tutte le scuole</option>
            {schoolOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="dal">Dal</Label>
          <Input id="dal" name="dal" type="date" defaultValue={filters.from} required />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="al">Al</Label>
          <Input id="al" name="al" type="date" defaultValue={filters.to} required />
        </div>
        <Button type="submit">Applica</Button>
      </form>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          label="Lezioni svolte"
          value={formatNumber(overall.lessonsDone)}
          hint={`su ${formatNumber(overall.lessonsTotal)} pianificate · ${formatNumber(overall.lessonsCancelled)} annullate`}
        />
        <Kpi label="Totale iscritti" value={formatNumber(overall.enrolled)} />
        <Kpi
          label="Presenze effettive"
          value={formatNumber(overall.attendees)}
          hint={`media ${formatNumber(overall.avgAttendees)} per lezione`}
        />
        <Kpi
          label="Frequenza"
          value={formatPercent(overall.attendanceRate)}
          hint="presenze / iscritti attesi"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">
          {selected ? "Dettaglio per classe" : "Dettaglio per scuola"}
        </h2>
        <div className="flex gap-2">
          <Link href={exportHref("riepilogo")} className={buttonVariants({ variant: "outline", size: "sm" })} prefetch={false}>
            Esporta riepilogo (CSV)
          </Link>
          <Link href={exportHref("lezioni")} className={buttonVariants({ variant: "outline", size: "sm" })} prefetch={false}>
            Esporta lezioni (CSV)
          </Link>
        </div>
      </div>

      {schools.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Nessun dato per i filtri selezionati.</p>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{selected ? "Classe" : "Scuola"}</TableHead>
                <TableHead className="text-right">Iscritti</TableHead>
                <TableHead className="text-right">Pianificate</TableHead>
                <TableHead className="text-right">Svolte</TableHead>
                <TableHead className="text-right">Annullate</TableHead>
                <TableHead className="text-right">Da svolgere</TableHead>
                <TableHead className="text-right">Presenze</TableHead>
                <TableHead className="text-right">Media/lezione</TableHead>
                <TableHead className="text-right">Frequenza</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {selected
                ? selected.classes.map((c) => (
                    <ReportRow key={c.classId} label={c.gradeName} t={c} />
                  ))
                : schools.map((s) => (
                    <ReportRow
                      key={s.schoolId}
                      label={
                        <Link
                          href={`/admin/report?${new URLSearchParams({ scuola: s.schoolId, dal: filters.from, al: filters.to })}`}
                          className="underline-offset-4 hover:underline"
                        >
                          {s.schoolName}
                        </Link>
                      }
                      t={s}
                    />
                  ))}
            </TableBody>
            <TableFooter>
              <ReportRow label="Totale" t={overall} />
            </TableFooter>
          </Table>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="text-2xl tabular-nums">{value}</CardTitle>
      </CardHeader>
      {hint && <CardContent className="text-xs text-muted-foreground">{hint}</CardContent>}
    </Card>
  );
}

function ReportRow({ label, t }: { label: React.ReactNode; t: ReportTotals }) {
  return (
    <TableRow>
      <TableCell className="font-medium">{label}</TableCell>
      {[
        formatNumber(t.enrolled),
        formatNumber(t.lessonsTotal),
        formatNumber(t.lessonsDone),
        formatNumber(t.lessonsCancelled),
        formatNumber(t.lessonsScheduled),
        formatNumber(t.attendees),
        formatNumber(t.avgAttendees),
        formatPercent(t.attendanceRate),
      ].map((v, i) => (
        <TableCell key={i} className="text-right tabular-nums">
          {v}
        </TableCell>
      ))}
    </TableRow>
  );
}
