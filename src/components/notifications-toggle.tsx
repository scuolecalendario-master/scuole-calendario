"use client";

import { Bell, BellOff, Share } from "lucide-react";
import { useEffect, useState, useTransition } from "react";

import { removePushSubscription, savePushSubscription, sendTestPush } from "@/app/(staff)/admin/push-actions";
import { Button } from "@/components/ui/button";

type Status = "loading" | "unsupported" | "ios-install" | "denied" | "off" | "on";

function urlBase64ToUint8Array(base64: string) {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0)) as Uint8Array<ArrayBuffer>;
}

// Inserita a build time da Next.js; tolti spazi e virgolette copiati per errore
const VAPID_PUBLIC_KEY = (process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "").trim().replace(/^["']|["']$/g, "");

function describe(e: unknown) {
  return e instanceof Error ? `${e.name}: ${e.message}` : String(e);
}

function withTimeout<T>(promise: Promise<T>, ms: number) {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("tempo scaduto")), ms)),
  ]);
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || ("standalone" in navigator && !!(navigator as { standalone?: boolean }).standalone);
}

/** Attiva/disattiva le notifiche push per le richieste delle scuole su questo dispositivo. */
export function NotificationsToggle() {
  const [status, setStatus] = useState<Status>("loading");
  const [message, setMessage] = useState<string>();
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      let next: Status;
      if (!supported) next = isIos() && !isStandalone() ? "ios-install" : "unsupported";
      else if (Notification.permission === "denied") next = "denied";
      else {
        const reg = await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        next = (await reg.pushManager.getSubscription()) ? "on" : "off";
      }
      if (!cancelled) setStatus(next);
    })().catch(() => !cancelled && setStatus("unsupported"));
    return () => {
      cancelled = true;
    };
  }, []);

  function enable() {
    setMessage(undefined);
    startTransition(async () => {
      // Ogni passaggio ha il suo messaggio: così si capisce subito cosa non va
      const key = VAPID_PUBLIC_KEY;
      if (!key) {
        setMessage(
          "Notifiche non configurate sul server: manca NEXT_PUBLIC_VAPID_PUBLIC_KEY su Vercel (poi serve un nuovo deploy).",
        );
        return;
      }
      let applicationServerKey: Uint8Array<ArrayBuffer>;
      try {
        applicationServerKey = urlBase64ToUint8Array(key);
        if (applicationServerKey.length !== 65) throw new Error("lunghezza");
      } catch {
        setMessage("La chiave NEXT_PUBLIC_VAPID_PUBLIC_KEY su Vercel non è valida: ricopiala senza spazi né virgolette.");
        return;
      }

      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "off");
        return;
      }

      let reg: ServiceWorkerRegistration;
      try {
        await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
        reg = await withTimeout(navigator.serviceWorker.ready, 10_000);
      } catch (e) {
        setMessage(`Il servizio per le notifiche non si è avviato (${describe(e)}). Ricarica la pagina e riprova.`);
        return;
      }

      let sub: PushSubscription;
      try {
        // Una sottoscrizione vecchia (es. creata con un'altra chiave) va rimossa prima
        const old = await reg.pushManager.getSubscription();
        if (old) await old.unsubscribe();
        sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey });
      } catch (e) {
        setMessage(
          `Il browser non riesce a registrarsi al servizio notifiche (${describe(e)}). ` +
            "Su Android usa Chrome o Samsung Internet aggiornati; in Brave attiva “Usa i servizi Google per la messaggistica push”.",
        );
        return;
      }

      const result = await savePushSubscription(JSON.parse(JSON.stringify(sub)), navigator.userAgent);
      if (result.error) {
        await sub.unsubscribe();
        setMessage(result.error);
        return;
      }
      setStatus("on");
      setMessage("Notifiche attive su questo dispositivo. Premi “Invia prova” per verificare.");
    });
  }

  function disable() {
    setMessage(undefined);
    startTransition(async () => {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await removePushSubscription(sub.endpoint);
        await sub.unsubscribe();
      }
      setStatus("off");
    });
  }

  function test() {
    setMessage(undefined);
    startTransition(async () => {
      const result = await sendTestPush();
      setMessage(result.error ?? "Notifica di prova inviata: dovrebbe comparire tra pochi secondi.");
    });
  }

  if (status === "loading") return null;

  return (
    <div className="flex flex-col gap-2">
      {status === "on" && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 font-semibold text-done-text">
            <Bell className="size-5" aria-hidden /> Notifiche attive su questo dispositivo
          </span>
          <Button variant="outline" onClick={test} disabled={pending} className="h-11">
            Invia prova
          </Button>
          <Button variant="ghost" onClick={disable} disabled={pending} className="h-11">
            <BellOff className="size-4" aria-hidden /> Disattiva
          </Button>
        </div>
      )}
      {status === "off" && (
        <Button onClick={enable} disabled={pending} className="h-auto min-h-12 self-start px-5 py-2 text-left text-base whitespace-normal">
          <Bell className="size-5" aria-hidden />
          {pending ? "Attivazione…" : "Attiva notifiche su questo dispositivo"}
        </Button>
      )}
      {status === "ios-install" && (
        <p className="text-sm">
          Su iPhone le notifiche funzionano solo dall&apos;app sulla schermata Home: tocca{" "}
          <Share className="inline size-4 align-text-bottom" aria-label="Condividi" /> e poi{" "}
          <strong>&quot;Aggiungi alla schermata Home&quot;</strong>, apri l&apos;app da lì e torna qui.
        </p>
      )}
      {status === "denied" && (
        <p className="text-sm">
          Le notifiche sono bloccate per questo sito: riattivale dalle impostazioni del browser, poi ricarica la pagina.
        </p>
      )}
      {status === "unsupported" && (
        <p className="text-sm text-muted-foreground">Questo browser non supporta le notifiche push.</p>
      )}
      {message && (
        <p className="text-sm text-muted-foreground" role="status">
          {message}
        </p>
      )}
    </div>
  );
}
