"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { dbErrorMessage, FormError, handleForm, readText, type ActionState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
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

// Alfabeto senza caratteri ambigui (0/o, 1/l/i): facile da dettare o copiare
const PASSWORD_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

function temporaryPassword() {
  const bytes = crypto.getRandomValues(new Uint32Array(12));
  const chars = Array.from(bytes, (b) => PASSWORD_ALPHABET[b % PASSWORD_ALPHABET.length]);
  // 3 gruppi da 4 caratteri, ~59 bit di entropia: basta per un uso singolo
  return [0, 4, 8].map((i) => chars.slice(i, i + 4).join("")).join("-");
}

/**
 * Imposta una password temporanea e obbliga l'utente a cambiarla al
 * prossimo accesso. La password viene restituita una sola volta.
 */
export async function resetPassword(profileId: string): Promise<{ error?: string; password?: string }> {
  const me = await requireRole("master");
  if (profileId === me.id) {
    return { error: "Per il tuo account usa \"Password\" in alto a destra." };
  }

  let admin;
  try {
    admin = createAdminClient();
  } catch {
    return { error: "Reset non disponibile: manca la chiave segreta di Supabase sul server." };
  }

  const password = temporaryPassword();
  const { error } = await admin.auth.admin.updateUserById(profileId, { password });
  if (error) return { error: "Reset non riuscito, riprova." };

  const { error: flagError } = await admin
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", profileId);
  if (flagError) return { error: "Password cambiata, ma non è stato possibile richiederne il cambio al primo accesso." };

  return { password };
}
