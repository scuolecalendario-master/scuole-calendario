"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { normalizeSchoolCode, SCHOOL_CODE_COOKIE } from "@/lib/school-code";
import { createSchoolClient } from "@/lib/supabase/server";

export type EnterCodeState = { error?: string };

export async function enterSchoolCode(
  _prev: EnterCodeState,
  formData: FormData,
): Promise<EnterCodeState> {
  const code = normalizeSchoolCode(String(formData.get("code") ?? ""));
  if (code.length < 8) {
    return { error: "Il codice deve avere almeno 8 caratteri." };
  }

  // Grazie alla RLS la query restituisce una riga solo se il codice è valido.
  const { data: school, error } = await createSchoolClient(code)
    .from("schools")
    .select("id")
    .maybeSingle();

  if (error) return { error: "Errore di connessione, riprova." };
  if (!school) return { error: "Codice scuola non valido." };

  const cookieStore = await cookies();
  cookieStore.set(SCHOOL_CODE_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 180,
  });

  redirect("/calendario");
}

export async function forgetSchoolCode() {
  const cookieStore = await cookies();
  cookieStore.delete(SCHOOL_CODE_COOKIE);
  redirect("/");
}
