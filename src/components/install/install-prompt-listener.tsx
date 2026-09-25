"use client";

import { useEffect } from "react";

import { markInstalled, setDeferredPrompt, type InstallPromptEvent } from "./install-state";

/** Montato nel layout principale: intercetta l'invito all'installazione del browser. */
export function InstallPromptListener() {
  useEffect(() => {
    function onPrompt(e: Event) {
      // Niente mini-banner automatico del browser: mostriamo il nostro pulsante
      e.preventDefault();
      setDeferredPrompt(e as InstallPromptEvent);
    }
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", markInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", markInstalled);
    };
  }, []);
  return null;
}
