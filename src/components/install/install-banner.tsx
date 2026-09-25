"use client";

import { Download, EllipsisVertical, PlusSquare, Share, Smartphone, X } from "lucide-react";
import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { getInstallSnapshot, isIos, isMobile, promptInstall, subscribe } from "./install-state";

const DISMISS_KEY = "installa:nascosto";
const noop = () => () => {};

function readDismissed() {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Invito a installare l'app sulla schermata Home (DESIGN.md: accesso in 1 tocco).
 * Android/Chrome: prompt nativo. iPhone: istruzioni (Apple non consente il prompt).
 * Nascosto se già installata, se chiuso con ✕ o su computer senza prompt.
 */
export function InstallBanner({ text, className }: { text: string; className?: string }) {
  const install = useSyncExternalStore(subscribe, getInstallSnapshot, () => "installed" as const);
  const device = useSyncExternalStore(
    noop,
    () => (isIos() ? "ios" : isMobile() ? "mobile" : "desktop"),
    () => "desktop" as const,
  );
  const storedDismissed = useSyncExternalStore(noop, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);
  const [help, setHelp] = useState(false);

  const canPrompt = install === "prompt";
  if (install === "installed" || dismissed || storedDismissed) return null;
  if (!canPrompt && device === "desktop") return null;

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {}
  }

  async function onInstall() {
    if (canPrompt) {
      const outcome = await promptInstall();
      if (outcome !== "unavailable") return;
    }
    setHelp(true);
  }

  return (
    <>
      <div
        className={cn(
          "flex items-center gap-3 rounded-2xl border-2 border-primary/30 bg-secondary p-3 print:hidden",
          className,
        )}
      >
        <span className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground min-[400px]:flex">
          <Smartphone className="size-5" aria-hidden />
        </span>
        <p className="min-w-0 flex-1 text-sm font-medium">{text}</p>
        <Button onClick={onInstall} className="h-11 shrink-0 px-4">
          <Download className="size-4" aria-hidden /> Installa
        </Button>
        <button
          type="button"
          onClick={dismiss}
          className="flex size-11 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-muted"
          aria-label="Non mostrare più"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <Dialog open={help} onOpenChange={setHelp}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Aggiungi alla schermata Home</DialogTitle>
            <DialogDescription>Così apri il calendario con un tocco, come un&apos;app.</DialogDescription>
          </DialogHeader>
          <ol className="flex flex-col gap-3">
            {(device === "ios"
              ? [
                  { icon: Share, text: <>Tocca <b>Condividi</b> nella barra del browser (il quadrato con la freccia)</> },
                  { icon: PlusSquare, text: <>Scorri e scegli <b>Aggiungi alla schermata Home</b></> },
                  { icon: Download, text: <>Tocca <b>Aggiungi</b> in alto a destra</> },
                ]
              : [
                  { icon: EllipsisVertical, text: <>Apri il <b>menu</b> del browser (i tre puntini)</> },
                  { icon: PlusSquare, text: <>Scegli <b>Installa app</b> o <b>Aggiungi a schermata Home</b></> },
                  { icon: Download, text: <>Conferma con <b>Installa</b> / <b>Aggiungi</b></> },
                ]
            ).map((s, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {i + 1}
                </span>
                <s.icon className="size-6 shrink-0 text-primary" aria-hidden />
                <span className="text-sm">{s.text}</span>
              </li>
            ))}
          </ol>
          <DialogFooter>
            <Button onClick={() => setHelp(false)} className="h-11">
              Ho capito
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
