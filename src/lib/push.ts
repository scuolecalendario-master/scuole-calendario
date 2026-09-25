import "server-only";

import webpush from "web-push";

import { createAdminClient } from "@/lib/supabase/admin";

export type PushPayload = {
  title: string;
  body: string;
  /** Pagina da aprire al tocco della notifica. */
  url: string;
  /** Notifiche con lo stesso tag si sostituiscono invece di accumularsi. */
  tag?: string;
};

function configure() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", publicKey, privateKey);
  return true;
}

/**
 * Invia una notifica push a tutti i dispositivi dei master.
 * Non blocca mai l'operazione principale: gli errori vengono solo registrati.
 * Le sottoscrizioni non più valide (404/410) vengono eliminate.
 */
export async function notifyMasters(payload: PushPayload) {
  if (!configure()) return;
  try {
    const admin = createAdminClient();
    const { data: subs } = await admin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth, profiles!inner(role)")
      .eq("profiles.role", "master");

    const expired: string[] = [];
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 24, urgency: "high" },
          );
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) expired.push(s.id);
          else console.error("[push] invio non riuscito", status);
        }
      }),
    );
    if (expired.length) await admin.from("push_subscriptions").delete().in("id", expired);
  } catch (e) {
    console.error("[push] errore", e);
  }
}
