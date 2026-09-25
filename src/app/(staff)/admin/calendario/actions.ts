"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { addDays, isISODate } from "@/lib/dates";
import { dbErrorMessage } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

// Chiamate dal calendario (client) con oggetti tipizzati; ogni input viene
// comunque rivalidato qui perché le Server Actions sono endpoint pubblici.

export type LessonActionResult = { error?: string; count?: number };

export type LessonInput = {
  classId: string;
  instructorId: string | null;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
};

const UUID = /^[0-9a-f-]{36}$/i;
const TIME = /^([01]\d|2[0-3]):[0-5]\d(:00)?$/;
const MAX_OCCURRENCES = 60;
const STATUSES: Enums<"lesson_status">[] = ["scheduled", "done", "cancelled"];

class InputError extends Error {}

function validate(input: LessonInput) {
  if (!UUID.test(input.classId)) throw new InputError("Seleziona una classe.");
  if (input.instructorId !== null && !UUID.test(input.instructorId)) {
    throw new InputError("Istruttore non valido.");
  }
  if (!isISODate(input.date)) throw new InputError("Data non valida.");
  if (!TIME.test(input.startTime) || !TIME.test(input.endTime)) {
    throw new InputError("Orario non valido.");
  }
  const start = input.startTime.slice(0, 5);
  const end = input.endTime.slice(0, 5);
  if (end <= start) throw new InputError("L'orario di fine deve essere dopo l'inizio.");
  const notes = input.notes?.trim().slice(0, 1000) || null;

  return {
    class_id: input.classId,
    instructor_id: input.instructorId,
    date: input.date,
    start_time: start,
    end_time: end,
    notes,
  };
}

async function run(fn: () => Promise<LessonActionResult>): Promise<LessonActionResult> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof InputError) return { error: e.message };
    throw e;
  }
}

function done(count?: number): LessonActionResult {
  // Report e portale scuole leggono le stesse lezioni
  revalidatePath("/admin", "layout");
  revalidatePath("/istruttore", "layout");
  return { count };
}

/** Crea una lezione, opzionalmente ripetuta ogni settimana fino a `repeatUntil`. */
export async function createLessons(input: LessonInput, repeatUntil: string | null) {
  return run(async () => {
    await requireRole("master");
    const row = validate(input);

    const dates = [row.date];
    if (repeatUntil) {
      if (!isISODate(repeatUntil) || repeatUntil < row.date) {
        throw new InputError("La data di fine ripetizione deve essere dopo la prima lezione.");
      }
      for (let d = addDays(row.date, 7); d <= repeatUntil; d = addDays(d, 7)) {
        dates.push(d);
        if (dates.length > MAX_OCCURRENCES) {
          throw new InputError(`Massimo ${MAX_OCCURRENCES} lezioni per volta.`);
        }
      }
    }

    const supabase = await createClient();
    const { data: cls } = await supabase
      .from("classes")
      .select("school_id")
      .eq("id", row.class_id)
      .maybeSingle();
    if (!cls) throw new InputError("Classe inesistente.");

    const { error } = await supabase
      .from("lessons")
      .insert(dates.map((date) => ({ ...row, date, school_id: cls.school_id })));
    if (error) return { error: dbErrorMessage(error) };
    return done(dates.length);
  });
}

export async function updateLesson(
  lessonId: string,
  input: LessonInput & { status: Enums<"lesson_status">; attendeesCount: number | null },
) {
  return run(async () => {
    await requireRole("master");
    if (!UUID.test(lessonId)) throw new InputError("Lezione non valida.");
    if (!STATUSES.includes(input.status)) throw new InputError("Stato non valido.");
    const attendees = input.status === "done" ? input.attendeesCount : null;
    if (attendees !== null && (!Number.isInteger(attendees) || attendees < 0)) {
      throw new InputError("Numero di presenti non valido.");
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("lessons")
      .update({ ...validate(input), status: input.status, attendees_count: attendees })
      .eq("id", lessonId);
    if (error) return { error: dbErrorMessage(error) };
    return done();
  });
}

/** Drag & drop / ridimensionamento: cambia solo data e orari. */
export async function moveLesson(lessonId: string, date: string, startTime: string, endTime: string) {
  return run(async () => {
    await requireRole("master");
    if (!UUID.test(lessonId) || !isISODate(date) || !TIME.test(startTime) || !TIME.test(endTime)) {
      throw new InputError("Spostamento non valido.");
    }
    if (endTime.slice(0, 5) <= startTime.slice(0, 5)) {
      throw new InputError("Una lezione deve iniziare e finire nello stesso giorno.");
    }

    const supabase = await createClient();
    const { error } = await supabase
      .from("lessons")
      .update({ date, start_time: startTime.slice(0, 5), end_time: endTime.slice(0, 5) })
      .eq("id", lessonId);
    if (error) return { error: dbErrorMessage(error) };
    return done();
  });
}

export async function deleteLesson(lessonId: string) {
  return run(async () => {
    await requireRole("master");
    if (!UUID.test(lessonId)) throw new InputError("Lezione non valida.");
    const supabase = await createClient();
    const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
    if (error) return { error: dbErrorMessage(error) };
    return done();
  });
}

// ---------- Corso settimanale ("Programma") ----------

const MAX_COURSE_LESSONS = 120;

/**
 * Crea tutte le lezioni di un corso in una sola volta. Le date arrivano già
 * calcolate dal client (giorni scelti, periodo, esclusioni) e vengono rivalidate.
 */
export async function createCourse(input: {
  classId: string;
  startTime: string;
  endTime: string;
  dates: string[];
}): Promise<LessonActionResult> {
  return run(async () => {
    await requireRole("master");
    const dates = [...new Set(input.dates)].filter(isISODate).sort();
    if (dates.length === 0) throw new InputError("Nessuna data selezionata.");
    if (dates.length > MAX_COURSE_LESSONS) {
      throw new InputError(`Massimo ${MAX_COURSE_LESSONS} lezioni per volta.`);
    }
    const row = validate({
      classId: input.classId,
      instructorId: null,
      date: dates[0],
      startTime: input.startTime,
      endTime: input.endTime,
      notes: null,
    });

    const supabase = await createClient();
    const { data: cls } = await supabase.from("classes").select("school_id").eq("id", row.class_id).maybeSingle();
    if (!cls) throw new InputError("Classe inesistente.");

    const { error } = await supabase
      .from("lessons")
      .insert(dates.map((date) => ({ ...row, date, school_id: cls.school_id })));
    if (error) return { error: dbErrorMessage(error) };
    return done(dates.length);
  });
}

/** Lezioni già presenti per la classe nel periodo (per segnalare sovrapposizioni). */
export async function getClassLessons(classId: string, from: string, to: string) {
  await requireRole("master");
  if (!UUID.test(classId) || !isISODate(from) || !isISODate(to)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("lessons")
    .select("date, start_time, end_time")
    .eq("class_id", classId)
    .gte("date", from)
    .lte("date", to)
    .neq("status", "cancelled")
    .limit(500);
  return data ?? [];
}
