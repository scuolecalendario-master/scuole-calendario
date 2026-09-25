"use server";

import { requireRole } from "@/lib/auth";
import { notifyProfile } from "@/lib/push";
import { createAdminClient } from "@/lib/supabase/admin";

export type SerializedSubscription = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

function isValid(sub: SerializedSubscription) {
  try {
    const url = new URL(sub.endpoint);
    return (
      url.protocol === "https:" &&
      typeof sub.keys?.p256dh === "string" &&
      typeof sub.keys?.auth === "string" &&
      sub.keys.p256dh.length < 200 &&
      sub.keys.auth.length < 100
    );
  } catch {
    return false;
  }
}

/** Salva la sottoscrizione push di questo dispositivo per il master connesso. */
export async function savePushSubscription(sub: SerializedSubscription, userAgent: string) {
  const me = await requireRole("master");
  if (!isValid(sub)) return { error: "Sottoscrizione non valida." };

  // Chiave segreta: lo stesso dispositivo può essere passato da un altro account
  const { error } = await createAdminClient()
    .from("push_subscriptions")
    .upsert(
      {
        profile_id: me.id,
        endpoint: sub.endpoint,
        p256dh: sub.keys.p256dh,
        auth: sub.keys.auth,
        user_agent: userAgent.slice(0, 200),
      },
      { onConflict: "endpoint" },
    );
  return error ? { error: "Non è stato possibile attivare le notifiche." } : {};
}

export async function removePushSubscription(endpoint: string) {
  const me = await requireRole("master");
  await createAdminClient().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("profile_id", me.id);
  return {};
}

export async function sendTestPush() {
  const me = await requireRole("master");
  const delivered = await notifyProfile(me.id, {
    title: "Notifiche attive ✓",
    body: "Riceverai qui le richieste di spostamento delle scuole.",
    url: "/admin/richieste",
    tag: "test",
  });
  return delivered > 0 ? {} : { error: "Nessun dispositivo ha ricevuto la notifica." };
}
