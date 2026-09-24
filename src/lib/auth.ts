import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

export type UserRole = Enums<"user_role">;

/** Profilo dell'utente autenticato, o null se non loggato. Deduplicato per richiesta. */
export const getCurrentProfile = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .maybeSingle();

  return profile;
});

/** Pagina di destinazione dopo il login in base al ruolo. */
export function homeForRole(role: UserRole | null | undefined) {
  if (role === "master") return "/admin";
  if (role === "instructor") return "/istruttore/oggi";
  return "/login?errore=non-autorizzato";
}

/**
 * Protegge una pagina/layout: reindirizza al login se non autenticato,
 * o alla home del proprio ruolo se il ruolo non è tra quelli ammessi.
 */
export async function requireRole(...allowed: UserRole[]) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (!profile.role || !allowed.includes(profile.role)) {
    redirect(homeForRole(profile.role));
  }
  return profile as typeof profile & { role: UserRole };
}
