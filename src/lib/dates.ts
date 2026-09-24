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

/** Lunedì della settimana che contiene `date`. */
export function startOfWeek(date: string): string {
  const dow = (toUTC(date).getUTCDay() + 6) % 7; // 0 = lunedì
  return addDays(date, -dow);
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
const shortFormat = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});
const numericFormat = new Intl.DateTimeFormat("it-IT", { timeZone: "UTC" });

export const formatDay = (date: string) => dayFormat.format(toUTC(date));
export const formatShort = (date: string) => shortFormat.format(toUTC(date));
export const formatDate = (date: string) => numericFormat.format(toUTC(date));
export const formatTime = (time: string) => time.slice(0, 5);
