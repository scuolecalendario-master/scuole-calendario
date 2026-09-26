"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { focusCatalog, sanitizeFocus } from "@/lib/focus";
import { dbErrorMessage } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

export type RecordInput = {
  /** true = lezione svolta, false = torna "programmata". */
  done: boolean;
  attendeesCount: number | null;
  focus: string[];
  /** Testo per "Gioco con…". */
  focusNote: string | null;
};

/**
 * Registrazione a bordo vasca: SOLO svolta, presenti e focus.
 * Il database applica le stesse regole (trigger lessons_before_write + RLS):
 * solo gli istruttori della classe, niente annullamento né note.
 */
export async function recordLesson(lessonId: string, input: RecordInput): Promise<{ error?: string }> {
  const me = await requireRole("instructor", "master");
  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) return { error: "Lezione non valida." };

  const supabase = await createClient();
  const { data: lesson, error: readError } = await supabase
    .from("lessons")
    .select("date, status, instructor_id, classes(level, total_enrolled)")
    .eq("id", lessonId)
    .maybeSingle();
  if (readError) return { error: "Collegamento non riuscito: riprova tra poco." };
  if (!lesson?.classes) return { error: "Lezione non trovata." };
  if (lesson.status === "cancelled") return { error: "La lezione è stata annullata." };

  let update;
  if (input.done) {
    if (lesson.date > todayISO()) return { error: "Una lezione futura non può essere segnata come svolta." };
    const n = input.attendeesCount;
    if (n === null || !Number.isInteger(n) || n < 0) return { error: "Indica quanti bambini erano presenti." };
    if (n > lesson.classes.total_enrolled) {
      return { error: `I presenti non possono superare gli iscritti (${lesson.classes.total_enrolled}).` };
    }
    const focus = sanitizeFocus(lesson.classes.level, input.focus);
    const needsNote = focus.some((id) => focusCatalog(lesson.classes!.level).find((f) => f.id === id)?.withNote);
    update = {
      status: "done" as const,
      attendees_count: n,
      focus,
      focus_note: needsNote ? input.focusNote?.trim().slice(0, 200) || null : null,
      // Chi registra una lezione senza istruttore la prende in carico
      ...(lesson.instructor_id === null && me.role === "instructor" ? { instructor_id: me.id } : {}),
    };
  } else {
    update = { status: "scheduled" as const };
  }

  const { data: updated, error } = await supabase
    .from("lessons")
    .update(update)
    .eq("id", lessonId)
    .select("id");
  if (error) return { error: dbErrorMessage(error) };
  if (!updated?.length) return { error: "Non sei tra gli istruttori di questa classe." };

  revalidatePath("/istruttore", "layout");
  revalidatePath("/admin", "layout");
  return {};
}
