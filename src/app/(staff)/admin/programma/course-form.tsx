"use client";

import { AlertTriangle, CalendarPlus, Check } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";

import { createCourse, getClassLessons } from "@/app/(staff)/admin/calendario/actions";
import { createClass } from "@/app/(staff)/admin/scuole/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { addDays, formatCompact, formatMonth, startOfSchoolYear, todayISO } from "@/lib/dates";
import { LEVEL_LABEL, LEVELS, type SchoolLevel } from "@/lib/focus";
import { cn } from "@/lib/utils";

type School = {
  id: string;
  name: string;
  sites: { id: string; name: string }[];
  classes: { id: string; grade_name: string; level: SchoolLevel; total_enrolled: number; site_id: string | null }[];
};

const WEEKDAYS = [
  { iso: 1, label: "Lun" },
  { iso: 2, label: "Mar" },
  { iso: 3, label: "Mer" },
  { iso: 4, label: "Gio" },
  { iso: 5, label: "Ven" },
  { iso: 6, label: "Sab" },
];

/** Giorno ISO (1 = lunedì … 7 = domenica) di una data "YYYY-MM-DD". */
function isoWeekday(date: string) {
  return ((new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7) + 1;
}

function addMinutes(time: string, minutes: number) {
  const [h, m] = time.split(":").map(Number);
  const t = Math.min(h * 60 + m + minutes, 23 * 60 + 55);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function minutesBetween(a: string, b: string) {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return bh * 60 + bm - (ah * 60 + am);
}

export function CourseForm({ schools }: { schools: School[] }) {
  const router = useRouter();
  const today = todayISO();
  const defaultEnd = `${Number(startOfSchoolYear(today).slice(0, 4)) + 1}-05-31`;

  const [schoolId, setSchoolId] = useState(schools[0].id);
  const [classId, setClassId] = useState("");
  const [days, setDays] = useState<number[]>([]);
  const [start, setStart] = useState("09:00");
  const [end, setEnd] = useState("09:45");
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(defaultEnd);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [existing, setExisting] = useState<{ date: string; start_time: string; end_time: string }[]>([]);
  const [message, setMessage] = useState<{ type: "ok" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const [newClass, setNewClass] = useState(false);

  const school = schools.find((s) => s.id === schoolId)!;
  const cls = school.classes.find((c) => c.id === classId);

  // Date del corso: giorni scelti nel periodo
  const dates = useMemo(() => {
    if (!days.length || !from || !to || to < from) return [];
    const out: string[] = [];
    for (let d = from; d <= to && out.length < 400; d = addDays(d, 1)) {
      if (days.includes(isoWeekday(d))) out.push(d);
    }
    return out;
  }, [days, from, to]);

  // Lezioni già presenti per la classe nel periodo (sovrapposizioni)
  useEffect(() => {
    if (!classId || to < from) return;
    let cancelled = false;
    getClassLessons(classId, from, to).then((rows) => !cancelled && setExisting(rows));
    return () => {
      cancelled = true;
    };
  }, [classId, from, to]);

  const overlapping = useMemo(() => {
    const s = start;
    const e = end;
    return new Set(
      existing.filter((l) => l.start_time.slice(0, 5) < e && l.end_time.slice(0, 5) > s).map((l) => l.date),
    );
  }, [existing, start, end]);

  const selected = dates.filter((d) => !excluded.has(d) && !overlapping.has(d));
  const byMonth = Map.groupBy(dates, (d) => formatMonth(d));
  const valid = !!cls && selected.length > 0 && end > start;

  function toggleDay(iso: number) {
    setDays((d) => (d.includes(iso) ? d.filter((x) => x !== iso) : [...d, iso].sort()));
  }

  function toggleDate(d: string) {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(d)) next.delete(d);
      else next.add(d);
      return next;
    });
  }

  function onStartChange(value: string) {
    // Mantiene la durata della lezione quando cambia l'inizio
    const duration = Math.max(minutesBetween(start, end), 15);
    setStart(value);
    setEnd(addMinutes(value, duration));
  }

  function submit() {
    if (!cls) return;
    setMessage(null);
    startTransition(async () => {
      const result = await createCourse({ classId: cls.id, startTime: start, endTime: end, dates: selected });
      if (result.error) {
        setMessage({ type: "error", text: result.error });
        return;
      }
      setMessage({ type: "ok", text: `${result.count} lezioni create per la classe ${cls.grade_name}.` });
      setExcluded(new Set());
      setExisting(await getClassLessons(cls.id, from, to));
    });
  }

  return (
    <div className="flex flex-col gap-5">
      {/* 1. Classe */}
      <Step n={1} title="Classe">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-school">Istituto</Label>
            <NativeSelect
              id="c-school"
              value={schoolId}
              onChange={(e) => {
                setSchoolId(e.target.value);
                setClassId("");
              }}
              className="h-11 text-base"
            >
              {schools.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-class">Classe</Label>
            <NativeSelect
              id="c-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="h-11 text-base"
            >
              <option value="" disabled>
                {school.classes.length ? "Scegli la classe…" : "Nessuna classe: creane una"}
              </option>
              {school.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.grade_name} · {LEVEL_LABEL[c.level]}
                  {c.site_id ? ` · ${school.sites.find((s) => s.id === c.site_id)?.name ?? ""}` : ""}
                </option>
              ))}
            </NativeSelect>
          </div>
        </div>
        {newClass ? (
          <QuickClassForm
            school={school}
            onCreated={(id) => {
              setNewClass(false);
              setClassId(id);
              router.refresh();
            }}
            onCancel={() => setNewClass(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setNewClass(true)}
            className="min-h-11 self-start font-semibold text-primary"
          >
            + Nuova classe
          </button>
        )}
      </Step>

      {/* 2. Giorni e orario */}
      <Step n={2} title="Giorni e orario">
        <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Giorni della settimana">
          {WEEKDAYS.map((d) => (
            <button
              key={d.iso}
              type="button"
              aria-pressed={days.includes(d.iso)}
              onClick={() => toggleDay(d.iso)}
              className={cn(
                "min-h-12 rounded-xl border-2 font-bold",
                days.includes(d.iso) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-start">Inizio</Label>
            <Input id="c-start" type="time" step={300} value={start} onChange={(e) => onStartChange(e.target.value)} className="h-11 text-base" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-end">Fine</Label>
            <Input id="c-end" type="time" step={300} value={end} onChange={(e) => setEnd(e.target.value)} className="h-11 text-base" />
          </div>
        </div>
      </Step>

      {/* 3. Periodo */}
      <Step n={3} title="Periodo">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-from">Dal</Label>
            <Input id="c-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-11 text-base" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="c-to">Al (compreso)</Label>
            <Input id="c-to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-11 text-base" />
          </div>
        </div>
      </Step>

      {/* 4. Anteprima */}
      <Step n={4} title="Anteprima">
        {dates.length === 0 ? (
          <p className="text-muted-foreground">Scegli almeno un giorno della settimana.</p>
        ) : (
          <>
            <p className="text-lg font-bold">
              {selected.length} lezioni
              {cls && ` · classe ${cls.grade_name}`} · {start}–{end}
            </p>
            <p className="text-sm text-muted-foreground">Tocca una data per toglierla (vacanze, gite…).</p>
            {overlapping.size > 0 && (
              <p className="flex items-center gap-2 rounded-xl bg-sun/30 p-2 text-sm font-medium">
                <AlertTriangle className="size-4 shrink-0" aria-hidden />
                {overlapping.size} date hanno già una lezione a quest&apos;ora: non verranno duplicate.
              </p>
            )}
            <div className="flex flex-col gap-3">
              {[...byMonth].map(([month, ds]) => (
                <div key={month}>
                  <p className="mb-1 font-semibold capitalize">{month}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {ds.map((d) => {
                      const clash = overlapping.has(d);
                      const off = excluded.has(d) || clash;
                      return (
                        <button
                          key={d}
                          type="button"
                          disabled={clash}
                          aria-pressed={!off}
                          onClick={() => toggleDate(d)}
                          title={clash ? "Esiste già una lezione a quest'ora" : undefined}
                          className={cn(
                            "min-h-11 rounded-xl border-2 px-3 text-sm font-semibold capitalize",
                            clash
                              ? "border-dashed border-sun bg-sun/20 text-foreground"
                              : off
                                ? "border-border bg-muted text-muted-foreground line-through"
                                : "border-primary bg-scheduled-soft text-scheduled-text",
                          )}
                        >
                          {formatCompact(d)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Step>

      {message && (
        <div
          role={message.type === "error" ? "alert" : "status"}
          className={cn(
            "flex flex-wrap items-center gap-2 rounded-2xl p-3 font-semibold",
            message.type === "error" ? "bg-cancelled-soft text-cancelled-text" : "bg-done-soft text-done-text",
          )}
        >
          {message.type === "ok" && <Check className="size-5" aria-hidden />}
          {message.text}
          {message.type === "ok" && (
            <Link href="/admin/calendario" className="ml-auto underline">
              Vedi nel calendario
            </Link>
          )}
        </div>
      )}

      <Button onClick={submit} disabled={!valid || pending} className="h-14 text-lg font-bold">
        <CalendarPlus className="size-6" aria-hidden />
        {pending ? "Creazione…" : valid ? `Crea ${selected.length} lezioni` : "Crea lezioni"}
      </Button>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-3xl border-2 bg-card p-4">
      <h2 className="flex items-center gap-2 text-lg font-bold">
        <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm text-primary-foreground">
          {n}
        </span>
        {title}
      </h2>
      {children}
    </section>
  );
}

/** Creazione veloce di una classe senza lasciare la pagina. */
function QuickClassForm({
  school,
  onCreated,
  onCancel,
}: {
  school: School;
  onCreated: (id: string) => void;
  onCancel: () => void;
}) {
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(async () => {
          const result = await createClass(school.id, {}, data);
          if (result.error || !result.classId) setError(result.error ?? "Classe non creata.");
          else onCreated(result.classId);
        });
      }}
      className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-primary/40 p-3"
    >
      <p className="font-semibold">Nuova classe in {school.name}</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Input name="grade_name" placeholder="Es. 3A" aria-label="Nome classe" maxLength={40} required className="h-11" />
        <NativeSelect name="level" defaultValue="" aria-label="Livello" required className="h-11">
          <option value="" disabled>
            Livello…
          </option>
          {LEVELS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.label}
            </option>
          ))}
        </NativeSelect>
        <NativeSelect name="site_id" defaultValue="" aria-label="Plesso" className="h-11">
          <option value="">Nessun plesso</option>
          {school.sites.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </NativeSelect>
        <Input
          name="total_enrolled"
          type="number"
          inputMode="numeric"
          min={0}
          max={200}
          defaultValue={20}
          aria-label="Iscritti"
          className="h-11"
        />
      </div>
      {error && (
        <p className="text-sm font-medium text-cancelled-text" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="h-11">
          {pending ? "…" : "Crea classe"}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} className="h-11">
          Annulla
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Gli istruttori della classe si assegnano dalla pagina dell&apos;istituto.
      </p>
    </form>
  );
}
