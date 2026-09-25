"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { dbErrorMessage } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";

/** Segna una richiesta come gestita (o la riapre). */
export async function setRequestHandled(requestId: string, handled: boolean) {
  const me = await requireRole("master");
  if (!/^[0-9a-f-]{36}$/i.test(requestId)) throw new Error("Richiesta non valida.");
  const supabase = await createClient();
  const { error } = await supabase
    .from("change_requests")
    .update(handled ? { handled_at: new Date().toISOString(), handled_by: me.id } : { handled_at: null, handled_by: null })
    .eq("id", requestId);
  if (error) throw new Error(dbErrorMessage(error));
  revalidatePath("/admin", "layout");
}
