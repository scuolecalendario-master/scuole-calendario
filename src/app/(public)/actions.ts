"use server";

import { redirect } from "next/navigation";

import {
  createSchoolClient,
  isValidSchoolCode,
  normalizeSchoolCode,
} from "@/lib/supabase/server";

export type EnterCodeState = { error?: string; code?: string };

export async function enterSchoolCode(
  _prev: EnterCodeState,
  formData: FormData,
): Promise<EnterCodeState> {
  const code = normalizeSchoolCode(String(formData.get("code") ?? ""));
  if (!isValidSchoolCode(code)) {
    return { error: "Codice non valido. Esempio: scuola-manzoni-8f3a1c2e", code };
  }

  // Grazie alla RLS la query restituisce una riga solo se il codice esiste.
  const { data: school, error } = await createSchoolClient(code)
    .from("schools")
    .select("id")
    .maybeSingle();

  if (error) return { error: "Errore di connessione, riprova.", code };
  if (!school) return { error: "Nessuna scuola trovata con questo codice.", code };

  redirect(`/scuola/${code}`);
}
