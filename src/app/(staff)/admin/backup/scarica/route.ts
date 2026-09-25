import type { NextRequest } from "next/server";

import { getCurrentProfile } from "@/lib/auth";
import { backupDownloadUrl } from "@/lib/backup";

/** Reindirizza a un URL firmato (60 s) del backup: solo per il master. */
export async function GET(request: NextRequest) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "master") return new Response("Non autorizzato", { status: 403 });
  const url = await backupDownloadUrl(request.nextUrl.searchParams.get("file") ?? "");
  if (!url) return new Response("Backup non trovato", { status: 404 });
  return Response.redirect(url, 302);
}
