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

/** Valore di una variabile d'ambiente senza spazi o virgolette copiati per errore. */
function env(name: string) {
  return (process.env[name] ?? "").trim().replace(/^["']|["']$/g, "");
}

function configure() {
  const publicKey = env("NEXT_PUBLIC_VAPID_PUBLIC_KEY");
  const privateKey = env("VAPID_PRIVATE_KEY");
  if (!publicKey || !privateKey) {
    console.error("[push] chiavi VAPID mancanti");
    return false;
  }
  try {
    webpush.setVapidDetails(env("VAPID_SUBJECT") || "mailto:admin@example.com", publicKey, privateKey);
    return true;
  } catch (e) {
    console.error("[push] chiavi VAPID non valide", e);
    return false;
  }
}

type Target = { role: "master" } | { profileId: string };

/**
 * Invia una notifica push ai dispositivi dei master (o di un utente).
 * Non blocca mai l'operazione principale: gli errori vengono solo registrati.
 * Le sottoscrizioni non più valide (404/410) vengono eliminate.
 * Restituisce quanti dispositivi hanno accettato la notifica.
 */
async function send(target: Target, payload: PushPayload): Promise<number> {
  if (!configure()) return 0;
  try {
    const admin = createAdminClient();
    let query = admin.from("push_subscriptions").select("id, endpoint, p256dh, auth, profiles!inner(role)");
    query = "role" in target ? query.eq("profiles.role", target.role) : query.eq("profile_id", target.profileId);
    const { data: subs } = await query;

    let delivered = 0;
    const expired: string[] = [];
    await Promise.all(
      (subs ?? []).map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            JSON.stringify(payload),
            { TTL: 60 * 60 * 24, urgency: "high" },
          );
          delivered++;
        } catch (e) {
          const status = (e as { statusCode?: number }).statusCode;
          if (status === 404 || status === 410) expired.push(s.id);
          else console.error("[push] invio non riuscito", status);
        }
      }),
    );
    if (expired.length) await admin.from("push_subscriptions").delete().in("id", expired);
    return delivered;
  } catch (e) {
    console.error("[push] errore", e);
    return 0;
  }
}

export const notifyMasters = (payload: PushPayload) => send({ role: "master" }, payload);
export const notifyProfile = (profileId: string, payload: PushPayload) => send({ profileId }, payload);
