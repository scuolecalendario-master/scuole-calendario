import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database";
import { supabaseUrl } from "./env";

/**
 * Client con chiave segreta: ignora la RLS e può gestire gli utenti Auth.
 * Usarlo SOLO in Server Actions già protette da requireRole("master")
 * (o per operazioni sul proprio account), mai in codice client.
 */
export function createAdminClient() {
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error(
      "SUPABASE_SECRET_KEY non configurata: aggiungila a .env.local e alle variabili d'ambiente di Vercel.",
    );
  }
  return createClient<Database>(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
