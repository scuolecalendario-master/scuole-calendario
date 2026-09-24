"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { homeForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type LoginState = { error?: string };
export type CodeState = { error?: string; sentTo?: string };

/** Dopo il login: redirect alla home del ruolo (o a `next`, se nella stessa area). */
async function redirectAfterLogin(supabase: SupabaseClient, userId: string, next: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile?.role) {
    await supabase.auth.signOut();
    return { error: "Account non ancora abilitato. Contatta l'amministratore." };
  }

  const home = homeForRole(profile.role);
  const isInArea = next === home || [`${home}/`, `${home}?`].some((p) => next.startsWith(p));
  redirect(isInArea ? next : home);
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "Email o password non corretti." };

  return redirectAfterLogin(supabase, data.user.id, String(formData.get("next") ?? ""));
}

/** Passo 1: invia il codice monouso (e il link) all'email, se abilitata. */
export async function sendLoginCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { error: "Inserisci un indirizzo email valido." };
  }

  const supabase = await createClient();
  const { data: allowed, error: checkError } = await supabase.rpc("is_staff_email", {
    p_email: email,
  });
  if (checkError) return { error: "Errore di connessione, riprova." };
  if (!allowed) {
    return { error: "Questa email non è abilitata. Contatta l'amministratore." };
  }

  const origin = (await headers()).get("origin") ?? "";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/confirm` },
  });
  if (error) {
    return {
      error:
        error.status === 429
          ? "Troppe richieste: attendi qualche minuto prima di richiedere un nuovo codice."
          : "Invio non riuscito, riprova.",
    };
  }
  return { sentTo: email };
}

/** Passo 2: verifica il codice ricevuto via email. */
export async function verifyLoginCode(_prev: CodeState, formData: FormData): Promise<CodeState> {
  const email = String(formData.get("email") ?? "");
  const token = String(formData.get("token") ?? "").replace(/\s/g, "");
  if (!/^\d{6,10}$/.test(token)) {
    return { sentTo: email, error: "Il codice è composto solo da cifre." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error || !data.user) {
    return { sentTo: email, error: "Codice non valido o scaduto." };
  }

  const result = await redirectAfterLogin(supabase, data.user.id, String(formData.get("next") ?? ""));
  return { sentTo: email, ...result };
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
