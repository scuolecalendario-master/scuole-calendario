"use client";

// Stato condiviso dell'installazione come app (PWA).
// Il browser invia "beforeinstallprompt" una sola volta, al caricamento: lo
// intercettiamo subito (InstallPromptListener nel layout) e lo teniamo qui,
// così il pulsante "Installa" può usarlo anche se viene mostrato dopo.

export type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferredPrompt: InstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function setDeferredPrompt(e: InstallPromptEvent | null) {
  deferredPrompt = e;
  notify();
}

export function markInstalled() {
  installed = true;
  deferredPrompt = null;
  notify();
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Snapshot per useSyncExternalStore: "prompt" se il browser può installare con un tocco. */
export function getInstallSnapshot(): "prompt" | "installed" | "none" {
  if (installed || isStandalone()) return "installed";
  return deferredPrompt ? "prompt" : "none";
}

export async function promptInstall() {
  const e = deferredPrompt;
  if (!e) return "unavailable" as const;
  await e.prompt();
  const { outcome } = await e.userChoice;
  // Il prompt si può usare una sola volta
  setDeferredPrompt(null);
  if (outcome === "accepted") markInstalled();
  return outcome;
}

export function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as { standalone?: boolean }).standalone))
  );
}

export function isIos() {
  return (
    /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

export function isMobile() {
  return window.matchMedia("(pointer: coarse)").matches && window.matchMedia("(max-width: 1024px)").matches;
}
