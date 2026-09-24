"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { dbErrorMessage, FormError, handleForm, readText, type ActionState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

const ROLES: Enums<"user_role">[] = ["instructor", "master"];
const VALIDITY_DAYS = [7, 14, 30];

export type CreateCodeState = ActionState & { code?: string; label?: string | null };

export async function createRegistrationCode(
  _prev: CreateCodeState,
  formData: FormData,
): Promise<CreateCodeState> {
  let created: { code: string; label: string | null } | undefined;

  const state = await handleForm(async () => {
    const me = await requireRole("master");
    const role = String(formData.get("role") ?? "instructor") as Enums<"user_role">;
    if (!ROLES.includes(role)) throw new FormError("Ruolo non valido.");
    const days = Number(formData.get("days"));
    if (!VALIDITY_DAYS.includes(days)) throw new FormError("Durata non valida.");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("registration_codes")
      .insert({
        role,
        label: readText(formData, "label", { label: "Nome istruttore", max: 120 }),
        created_by: me.id,
        expires_at: new Date(Date.now() + days * 86_400_000).toISOString(),
      })
      .select("code, label")
      .single();
    if (error) throw new FormError(dbErrorMessage(error));
    created = data;
  });

  if (!created) return state;
  revalidatePath("/admin/istruttori");
  return { ...created, success: "Codice creato." };
}

/** Elimina un codice non ancora usato. */
export async function deleteRegistrationCode(codeId: string) {
  await requireRole("master");
  const supabase = await createClient();
  const { error } = await supabase
    .from("registration_codes")
    .delete()
    .eq("id", codeId)
    .is("used_at", null);
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath("/admin/istruttori");
}

/** Revoca l'accesso: il profilo resta (con lo storico delle lezioni) ma senza ruolo. */
export async function revokeAccess(profileId: string) {
  const me = await requireRole("master");
  if (profileId === me.id) throw new Error("Non puoi revocare il tuo stesso accesso.");

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role: null }).eq("id", profileId);
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath("/admin/istruttori");
}
