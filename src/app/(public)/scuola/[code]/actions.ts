"use server";

import { after } from "next/server";

import { isISODate } from "@/lib/dates";
import { FormError, handleForm, readText, type ActionState } from "@/lib/forms";
import { UUID } from "@/lib/portal";
import { notifyMasters } from "@/lib/push";
import { createSchoolClient, isValidSchoolCode, normalizeSchoolCode } from "@/lib/supabase/server";

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Richiesta di spostamento di una lezione dal portale maestre.
 * La RLS accetta solo lezioni future dell'istituto del codice (max 3 aperte).
 */
export async function requestChange(
  rawCode: string,
  lessonId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  return handleForm(async () => {
    const code = normalizeSchoolCode(rawCode);
    if (!isValidSchoolCode(code) || !UUID.test(lessonId)) throw new FormError("Richiesta non valida.");

    const message = readText(formData, "message", { label: "Messaggio", required: true, max: 500 })!;
    const teacherName = readText(formData, "teacher_name", { label: "Nome", required: true, max: 80 })!;
    if (message.length < 3) throw new FormError("Scrivi il motivo della richiesta.");
    if (teacherName.length < 2) throw new FormError("Scrivi il tuo nome.");
    const date = String(formData.get("proposed_date") ?? "");
    const time = String(formData.get("proposed_time") ?? "").slice(0, 5);

    const supabase = createSchoolClient(code);
    const [{ data: school }, { data: lesson }] = await Promise.all([
      supabase.from("schools").select("id, name").maybeSingle(),
      supabase.from("lessons").select("date, start_time, classes(grade_name)").eq("id", lessonId).maybeSingle(),
    ]);
    if (!school || !lesson) throw new FormError("Lezione non trovata.");

    // Nessun .select(): le scuole possono inserire ma non leggere le richieste
    const { error } = await supabase.from("change_requests").insert({
      school_id: school.id,
      lesson_id: lessonId,
      teacher_name: teacherName,
      message,
      proposed_date: isISODate(date) ? date : null,
      proposed_time: TIME.test(time) ? time : null,
    });
    if (error) {
      throw new FormError(
        error.code === "23514"
          ? "Ci sono già richieste in attesa per questa lezione: l'organizzazione ti ricontatterà."
          : "Non è stato possibile inviare la richiesta. La lezione potrebbe essere già passata.",
      );
    }

    // La notifica parte dopo la risposta: la maestra non aspetta il servizio push
    after(() =>
      notifyMasters({
        title: `Richiesta di spostamento · ${school.name}`,
        body: `Classe ${lesson.classes?.grade_name ?? ""} (${lesson.date.split("-").reverse().join("/")} ${lesson.start_time.slice(0, 5)}) — ${teacherName}: ${message.slice(0, 100)}`,
        url: "/admin/richieste",
        tag: `richiesta-${lessonId}`,
      }),
    );

    return { success: "Richiesta inviata." };
  });
}
