"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { todayISO } from "@/lib/dates";
import { dbErrorMessage } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type RecordInput = {
  status: Enums<"lesson_status">;
  attendeesCount: number | null;
  notes: string | null;
};

const STATUSES: Enums<"lesson_status">[] = ["scheduled", "done", "cancelled"];

/**
 * Registra l'esito di una lezione a bordo vasca: stato, presenti e note.
 * Se la lezione non ha un istruttore, viene assegnata a chi la registra.
 */
export async function recordLesson(lessonId: string, input: RecordInput): Promise<{ error?: string }> {
  const me = await requireRole("instructor", "master");

  if (!/^[0-9a-f-]{36}$/i.test(lessonId)) return { error: "Lezione non valida." };
  if (!STATUSES.includes(input.status)) return { error: "Stato non valido." };

  const attendees = input.status === "done" ? input.attendeesCount : null;
  if (input.status === "done") {
    if (attendees === null || !Number.isInteger(attendees) || attendees < 0) {
      return { error: "Indica quanti bambini erano presenti." };
    }
  }

  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("date, instructor_id")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return { error: "Lezione non trovata." };
  if (input.status === "done" && lesson.date > todayISO()) {
    return { error: "Una lezione futura non può essere segnata come svolta." };
  }

  const { error } = await supabase
    .from("lessons")
    .update({
      status: input.status,
      attendees_count: attendees,
      notes: input.notes?.trim().slice(0, 1000) || null,
      ...(lesson.instructor_id === null && input.status !== "scheduled"
        ? { instructor_id: me.id }
        : {}),
    })
    .eq("id", lessonId);
  if (error) return { error: dbErrorMessage(error) };

  revalidatePath("/istruttore", "layout");
  revalidatePath("/admin", "layout");
  return {};
}
