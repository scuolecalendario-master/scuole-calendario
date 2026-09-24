"use server";

import { redirect } from "next/navigation";

import { getCurrentProfile, homeForRole } from "@/lib/auth";
import { FormError, handleForm, type ActionState } from "@/lib/forms";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const MIN_PASSWORD = 8;

export async function changePassword(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let home: string | undefined;

  const state = await handleForm(async () => {
    const profile = await getCurrentProfile();
    if (!profile?.email) redirect("/login");

    const current = String(formData.get("current") ?? "");
    const next = String(formData.get("password") ?? "");
    const confirm = String(formData.get("confirm") ?? "");
    if (next.length < MIN_PASSWORD) {
      throw new FormError(`La nuova password deve avere almeno ${MIN_PASSWORD} caratteri.`);
    }
    if (next !== confirm) throw new FormError("Le due password non coincidono.");
    if (next === current) throw new FormError("La nuova password deve essere diversa da quella attuale.");

    const supabase = await createClient();
    // Verifica la password attuale (protegge da sessioni lasciate aperte)
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: profile.email,
      password: current,
    });
    if (authError) throw new FormError("La password attuale non è corretta.");

    const { error } = await supabase.auth.updateUser({ password: next });
    if (error) {
      throw new FormError(
        error.code === "weak_password"
          ? "Password troppo debole: usa lettere e numeri."
          : "Cambio password non riuscito, riprova.",
      );
    }

    if (profile.must_change_password) {
      await createAdminClient()
        .from("profiles")
        .update({ must_change_password: false })
        .eq("id", profile.id);
    }
    home = homeForRole(profile.role);
  });

  if (home) redirect(home);
  return state;
}
