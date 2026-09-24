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
import { createClient } from "@/lib/supabase/server";

// Ogni action verifica il ruolo: le Server Actions sono raggiungibili con POST
// diretti. La RLS resta comunque l'ultima barriera.

function readSchool(formData: FormData) {
  return {
    name: readText(formData, "name", { label: "Nome scuola", required: true, max: 120 })!,
    contact_email: readEmail(formData, "contact_email", { label: "Email di contatto" }),
  };
}

function readClass(formData: FormData) {
  return {
    grade_name: readText(formData, "grade_name", { label: "Classe", required: true, max: 40 })!,
    total_enrolled: readInt(formData, "total_enrolled", { label: "Iscritti", max: 200 }),
  };
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

export async function createClass(schoolId: string, _prev: ActionState, formData: FormData) {
  return handleForm(async () => {
    await requireRole("master");
    const supabase = await createClient();
    const { error } = await supabase
      .from("classes")
      .insert({ school_id: schoolId, ...readClass(formData) });
    if (error) throw new FormError(dbErrorMessage(error, { unique: CLASS_UNIQUE }));
    revalidatePath(`/admin/scuole/${schoolId}`);
    return { success: "Classe aggiunta." };
  });
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
