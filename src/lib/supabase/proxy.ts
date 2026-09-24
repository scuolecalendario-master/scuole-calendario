import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import type { Database } from "@/types/database";
import { supabaseKey, supabaseUrl } from "./env";

// Controllo ottimistico (solo sessione): i ruoli sono verificati nei layout
// con requireRole() e, in ultima istanza, dalle policy RLS.
const PROTECTED_PREFIXES = ["/admin", "/istruttore"];

/** Aggiorna la sessione Supabase e protegge le rotte riservate. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) =>
          response.headers.set(key, value),
        );
      },
    },
  });

  // Non inserire codice tra createServerClient e getClaims():
  // getClaims() rinnova il token se necessario.
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  const { pathname, search } = request.nextUrl;
  if (!user && PROTECTED_PREFIXES.some((p) => pathname.startsWith(p))) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return NextResponse.redirect(url);
  }

  return response;
}
