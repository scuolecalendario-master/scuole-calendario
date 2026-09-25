import "server-only";

import { notFound } from "next/navigation";

import { createSchoolClient, isValidSchoolCode, normalizeSchoolCode } from "@/lib/supabase/server";

export const UUID = /^[0-9a-f-]{36}$/i;

/** Istituto del portale maestre dal codice nell'URL (404 se non valido). */
export async function getPortalSchool(rawCode: string) {
  const code = normalizeSchoolCode(rawCode);
  if (!isValidSchoolCode(code)) notFound();

  const supabase = createSchoolClient(code);
  const { data: school } = await supabase.from("schools").select("id, name").maybeSingle();
  if (!school) notFound();

  return { code, school, supabase };
}
