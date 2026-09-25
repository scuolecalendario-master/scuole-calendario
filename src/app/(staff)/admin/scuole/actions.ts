"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireRole } from "@/lib/auth";
import {
  dbErrorMessage,
  FormError,
  handleForm,
  readEmail,
  readInt,
  readText,
  type ActionState,
} from "@/lib/forms";
import { LEVELS, type SchoolLevel } from "@/lib/focus";
import { createClient } from "@/lib/supabase/server";

// Ogni action verifica il ruolo: le Server Actions sono raggiungibili con POST
// diretti. La RLS resta comunque l'ultima barriera.

function readSchool(formData: FormData) {
  return {
    name: readText(formData, "name", { label: "Nome istituto", required: true, max: 120 })!,
    contact_email: readEmail(formData, "contact_email", { label: "Email di contatto" }),
  };
}

const UUID = /^[0-9a-f-]{36}$/i;

function readClass(formData: FormData) {
  const level = String(formData.get("level") ?? "") as SchoolLevel;
  if (!LEVELS.some((l) => l.id === level)) throw new FormError("Scegli il livello della classe.");
  const site = String(formData.get("site_id") ?? "");
  return {
    grade_name: readText(formData, "grade_name", { label: "Classe", required: true, max: 40 })!,
    total_enrolled: readInt(formData, "total_enrolled", { label: "Iscritti", max: 200 }),
    level,
    // il trigger classes_check_site verifica che il plesso sia dello stesso istituto
    site_id: UUID.test(site) ? site : null,
  };
}

function readInstructors(formData: FormData) {
  return [...new Set(formData.getAll("instructors").map(String).filter((id) => UUID.test(id)))];
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Allinea gli istruttori della classe all'elenco scelto nel form. */
async function syncInstructors(supabase: Supabase, classId: string, profileIds: string[]) {
  const { error: delError } = await supabase
    .from("class_instructors")
    .delete()
    .eq("class_id", classId)
    .not("profile_id", "in", `(${profileIds.length ? profileIds.join(",") : "00000000-0000-0000-0000-000000000000"})`);
  if (delError) throw new FormError(dbErrorMessage(delError));
  if (profileIds.length) {
    const { error } = await supabase
      .from("class_instructors")
      .upsert(profileIds.map((profile_id) => ({ class_id: classId, profile_id })), { ignoreDuplicates: true });
    if (error) throw new FormError(dbErrorMessage(error));
  }
}

const CLASS_UNIQUE = "Esiste già una classe con questo nome in questa scuola.";

// ---------- Scuole ----------

export async function createSchool(_prev: ActionState, formData: FormData) {
  let schoolId: string | undefined;
  const state = await handleForm(async () => {
    await requireRole("master");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("schools")
      // unique_code vuoto: lo genera il trigger schools_before_write dal nome
      .insert({ ...readSchool(formData), unique_code: "" })
      .select("id")
      .single();
    if (error) throw new FormError(dbErrorMessage(error));
    schoolId = data.id;
  });
  if (!schoolId) return state;

  revalidatePath("/admin", "layout");
  redirect(`/admin/scuole/${schoolId}`);
}

export async function updateSchool(schoolId: string, _prev: ActionState, formData: FormData) {
  return handleForm(async () => {
    await requireRole("master");
    const supabase = await createClient();
    const { error } = await supabase.from("schools").update(readSchool(formData)).eq("id", schoolId);
    if (error) throw new FormError(dbErrorMessage(error));
    revalidatePath("/admin", "layout");
    return { success: "Dati salvati." };
  });
}

export async function regenerateSchoolCode(schoolId: string) {
  await requireRole("master");
  const supabase = await createClient();
  const { error } = await supabase.rpc("regenerate_school_code", { p_school_id: schoolId });
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath(`/admin/scuole/${schoolId}`);
}

export async function deleteSchool(schoolId: string) {
  await requireRole("master");
  const supabase = await createClient();
  const { error } = await supabase.from("schools").delete().eq("id", schoolId);
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath("/admin", "layout");
  redirect("/admin/scuole");
}

// ---------- Classi ----------

/** Crea una classe; restituisce anche `classId` (usato dal modulo "Programma"). */
export async function createClass(
  schoolId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState & { classId?: string }> {
  let classId: string | undefined;
  const state = await handleForm(async () => {
    await requireRole("master");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("classes")
      .insert({ school_id: schoolId, ...readClass(formData) })
      .select("id")
      .single();
    if (error) throw new FormError(dbErrorMessage(error, { unique: CLASS_UNIQUE }));
    await syncInstructors(supabase, data.id, readInstructors(formData));
    classId = data.id;
    revalidatePath(`/admin/scuole/${schoolId}`);
    revalidatePath("/admin/programma");
    return { success: "Classe aggiunta." };
  });
  return { ...state, classId };
}

export async function updateClass(classId: string, _prev: ActionState, formData: FormData) {
  return handleForm(async () => {
    await requireRole("master");
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("classes")
      .update(readClass(formData))
      .eq("id", classId)
      .select("school_id")
      .single();
    if (error) throw new FormError(dbErrorMessage(error, { unique: CLASS_UNIQUE }));
    await syncInstructors(supabase, classId, readInstructors(formData));
    revalidatePath(`/admin/scuole/${data.school_id}`);
    return { success: "Salvato." };
  });
}

export async function deleteClass(classId: string) {
  await requireRole("master");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("classes")
    .delete()
    .eq("id", classId)
    .select("school_id")
    .single();
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath(`/admin/scuole/${data.school_id}`);
}

// ---------- Plessi ----------

const SITE_UNIQUE = "Esiste già un plesso con questo nome in questo istituto.";

export async function createSite(schoolId: string, _prev: ActionState, formData: FormData) {
  return handleForm(async () => {
    await requireRole("master");
    const supabase = await createClient();
    const name = readText(formData, "name", { label: "Nome plesso", required: true, max: 120 })!;
    const { error } = await supabase.from("sites").insert({ school_id: schoolId, name });
    if (error) throw new FormError(dbErrorMessage(error, { unique: SITE_UNIQUE }));
    revalidatePath(`/admin/scuole/${schoolId}`);
    return { success: "Plesso aggiunto." };
  });
}

export async function renameSite(siteId: string, _prev: ActionState, formData: FormData) {
  return handleForm(async () => {
    await requireRole("master");
    const supabase = await createClient();
    const name = readText(formData, "name", { label: "Nome plesso", required: true, max: 120 })!;
    const { data, error } = await supabase
      .from("sites")
      .update({ name })
      .eq("id", siteId)
      .select("school_id")
      .single();
    if (error) throw new FormError(dbErrorMessage(error, { unique: SITE_UNIQUE }));
    revalidatePath(`/admin/scuole/${data.school_id}`);
    return { success: "Salvato." };
  });
}

/** Elimina il plesso: le sue classi restano nell'istituto, senza plesso. */
export async function deleteSite(siteId: string) {
  await requireRole("master");
  const supabase = await createClient();
  const { data, error } = await supabase.from("sites").delete().eq("id", siteId).select("school_id").single();
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath(`/admin/scuole/${data.school_id}`);
}
