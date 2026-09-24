import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { homeForRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/**
 * Destinazione del link ricevuto via email.
 * Supporta sia il template con `token_hash` (funziona anche aprendo il link
 * su un altro dispositivo) sia il flusso PKCE predefinito con `code`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");

  const supabase = await createClient();
  const { data, error } = tokenHash && type
    ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    : code
      ? await supabase.auth.exchangeCodeForSession(code)
      : { data: { user: null }, error: new Error("Parametri mancanti") };

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?errore=link-non-valido", request.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", data.user.id)
    .maybeSingle();

  return NextResponse.redirect(new URL(homeForRole(profile?.role), request.url));
}
