import type { NextRequest } from "next/server";

import { createBackup } from "@/lib/backup";

// Chiamata ogni notte dal cron di Vercel (vercel.json), che invia
// "Authorization: Bearer <CRON_SECRET>". Senza segreto valido: 401.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorizzato", { status: 401 });
  }
  try {
    const result = await createBackup();
    return Response.json({ ok: true, ...result });
  } catch (e) {
    console.error("[backup] non riuscito", e);
    return Response.json({ ok: false }, { status: 500 });
  }
}
