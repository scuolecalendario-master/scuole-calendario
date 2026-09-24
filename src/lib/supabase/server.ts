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

/**
 * Client anonimo che si identifica con il codice scuola.
 * Le policy RLS leggono l'header `x-school-code` e restituiscono
 * solo i dati della scuola corrispondente.
 */
export function createSchoolClient(schoolCode: string) {
  return createSupabaseClient<Database>(supabaseUrl, supabaseKey, {
    global: { headers: { "x-school-code": schoolCode } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
