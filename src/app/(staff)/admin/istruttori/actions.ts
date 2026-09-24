"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import {
  dbErrorMessage,
  FormError,
  handleForm,
  readEmail,
  readText,
  type ActionState,
} from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

const ROLES: Enums<"user_role">[] = ["instructor", "master"];

export async function inviteStaff(_prev: ActionState, formData: FormData) {
  return handleForm(async () => {
    const me = await requireRole("master");
    const email = readEmail(formData, "email", { label: "Email", required: true })!;
    const role = String(formData.get("role") ?? "instructor") as Enums<"user_role">;
    if (!ROLES.includes(role)) throw new FormError("Ruolo non valido.");
    if (email === me.email) throw new FormError("Non puoi modificare il tuo stesso accesso.");

    const supabase = await createClient();
    const { error } = await supabase.from("staff_invites").upsert({
      email,
      role,
      full_name: readText(formData, "full_name", { label: "Nome", max: 120 }),
      invited_by: me.id,
    });
    if (error) throw new FormError(dbErrorMessage(error));

    revalidatePath("/admin/istruttori");
    return { success: `${email} abilitato. Può accedere da /login con "Ricevi codice via email".` };
  });
}

export async function revokeStaff(email: string) {
  const me = await requireRole("master");
  if (email === me.email) throw new Error("Non puoi revocare il tuo stesso accesso.");

  const supabase = await createClient();
  const { error } = await supabase.from("staff_invites").delete().eq("email", email);
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath("/admin/istruttori");
}
