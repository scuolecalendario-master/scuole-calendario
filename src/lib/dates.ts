// Le lezioni usano date "YYYY-MM-DD" e orari "HH:MM:SS" (fuso Europe/Rome).
// Le operazioni sulle date lavorano in UTC per evitare salti dell'ora legale.

const TIME_ZONE = "Europe/Rome";
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function todayISO(): string {
  // en-CA formatta come YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(new Date());
}

export function isISODate(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE.test(value) && !Number.isNaN(Date.parse(value));
}

function toUTC(date: string) {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 1 settembre dell'anno scolastico in corso. */
export function startOfSchoolYear(date: string): string {
  const [y, m] = date.split("-").map(Number);
  return `${m >= 9 ? y : y - 1}-09-01`;
}

const dayFormat = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "UTC",
});
const numericFormat = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC" });

export const formatDay = (date: string) => dayFormat.format(toUTC(date));
export const formatDate = (date: string) => numericFormat.format(toUTC(date));
export const formatTime = (time: string) => time.slice(0, 5);

/** Ora attuale in Italia "HH:MM". */
export function nowTimeRome(): string {
  return new Intl.DateTimeFormat("it-IT", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  }).format(new Date());
}

/** Giorni tra due date "YYYY-MM-DD" (b − a). */
function daysBetween(a: string, b: string): number {
  return Math.round((toUTC(b).getTime() - toUTC(a).getTime()) / 86_400_000);
}

/** "Oggi", "Domani", "Tra 5 giorni", "Tra 3 settimane". */
export function relativeDay(date: string, today = todayISO()): string {
  const d = daysBetween(today, date);
  if (d === 0) return "Oggi";
  if (d === 1) return "Domani";
  if (d < 14) return `Tra ${d} giorni`;
  return `Tra ${Math.round(d / 7)} settimane`;
}

const monthFormat = new Intl.DateTimeFormat("it-IT", { month: "long", year: "numeric", timeZone: "UTC" });
const compactFormat = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "numeric",
  timeZone: "UTC",
});

/** "settembre 2026" */
export const formatMonth = (date: string) => monthFormat.format(toUTC(date));
/** "mar 29/09" */
export const formatCompact = (date: string) => compactFormat.format(toUTC(date)).replace(",", "");
