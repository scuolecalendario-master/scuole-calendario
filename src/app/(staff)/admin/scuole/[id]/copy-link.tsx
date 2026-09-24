"use client";

import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const subscribe = () => () => {};

/** Mostra il link di accesso per le maestre e lo copia negli appunti. */
export function CopyLink({ path }: { path: string }) {
  // L'origine (localhost, dominio Vercel…) è nota solo nel browser
  const origin = useSyncExternalStore(subscribe, () => window.location.origin, () => "");
  const [copied, setCopied] = useState(false);
  const url = `${origin}${path}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-sm">
        {url}
      </code>
      <Button type="button" variant="outline" size="sm" onClick={copy}>
        {copied ? "Copiato ✓" : "Copia link"}
      </Button>
    </div>
  );
}
