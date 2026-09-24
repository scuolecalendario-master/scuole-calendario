"use server";

import { redirect } from "next/navigation";

import { homeForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "Email o password non corretti." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!profile?.role) {
    await supabase.auth.signOut();
    return {
      error: "Account non abilitato. Chiedi un codice di registrazione all'amministratore.",
    };
  }

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
