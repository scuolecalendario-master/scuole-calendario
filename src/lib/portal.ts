import "server-only";

import { notFound } from "next/navigation";

import { createSchoolClient, isValidSchoolCode, normalizeSchoolCode } from "@/lib/supabase/server";
import { orThrow } from "@/lib/db";

export const UUID = /^[0-9a-f-]{36}$/i;

/** Istituto del portale maestre dal codice nell'URL (404 se non valido). */
export async function getPortalSchool(rawCode: string) {
  const code = normalizeSchoolCode(rawCode);
  if (!isValidSchoolCode(code)) notFound();

  const supabase = createSchoolClient(code);
  // Errore del database ≠ codice sbagliato: il primo mostra "Riprova"
  const school = orThrow(await supabase.from("schools").select("id, name, change_requests_enabled").maybeSingle());
  if (!school) notFound();

  return { code, school, supabase };
}
