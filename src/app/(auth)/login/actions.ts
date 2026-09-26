"use server";

import { redirect } from "next/navigation";

import { homeForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// `email` torna al form: dopo un errore il campo non va riscritto
export type LoginState = { error?: string; email?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "Email o password non corretti.", email };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, must_change_password")
    .eq("id", data.user.id)
    .maybeSingle();
  if (profileError) {
    await supabase.auth.signOut();
    return { error: "Collegamento non riuscito: riprova tra poco.", email };
  }

  if (!profile?.role) {
    await supabase.auth.signOut();
    return {
      error: "Account non abilitato. Chiedi un codice di registrazione all'amministratore.",
      email,
    };
  }

  if (profile.must_change_password) redirect("/password");

  const next = String(formData.get("next") ?? "");
  const home = homeForRole(profile.role);
  // Rispetta `next` solo se è un percorso interno dell'area del proprio ruolo
  // ("/admin…" per il master, "/istruttore…" per gli istruttori).
  const area = home.split("/").slice(0, 2).join("/");
  const isInArea = next === area || [`${area}/`, `${area}?`].some((p) => next.startsWith(p));
  redirect(isInArea ? next : home);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
