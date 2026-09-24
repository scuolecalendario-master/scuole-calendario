import "server-only";

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import type { Database } from "@/types/database";
import { supabaseKey, supabaseUrl } from "./env";

/** Client legato alla sessione dell'utente autenticato (cookie). */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Chiamato da un Server Component: il refresh della sessione
          // viene gestito da src/proxy.ts.
        }
      },
    },
  });
}

/** Normalizza un codice scuola come lo salva il database. */
export function normalizeSchoolCode(code: string) {
  return code.trim().toLowerCase();
}

/** Stesso formato imposto dal vincolo su schools.unique_code. */
export function isValidSchoolCode(code: string) {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(code) && code.length >= 8 && code.length <= 64;
}

/**
 * Client anonimo che si identifica con il codice scuola.
 * Le policy RLS leggono l'header `x-school-code` e restituiscono
 * solo i dati della scuola corrispondente.
 */
export function createSchoolClient(schoolCode: string) {
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { "x-school-code": normalizeSchoolCode(schoolCode) } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
