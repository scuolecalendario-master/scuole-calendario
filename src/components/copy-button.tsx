"use client";

import { useState, useSyncExternalStore } from "react";

import { Button } from "@/components/ui/button";

const noopSubscribe = () => () => {};

/** Origine del sito (localhost, dominio Vercel…): nota solo nel browser. */
export function useOrigin() {
  return useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "");
}

export function CopyButton({
  text,
  label = "Copia",
  variant = "outline",
}: {
  text: string;
  label?: string;
  variant?: "outline" | "default" | "secondary";
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <Button type="button" variant={variant} size="sm" onClick={copy}>
      {copied ? "Copiato ✓" : label}
    </Button>
  );
}

/** Link assoluto mostrato in chiaro con pulsante di copia. */
export function CopyLink({ path, label = "Copia link" }: { path: string; label?: string }) {
  const url = `${useOrigin()}${path}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-md bg-muted px-2 py-1.5 font-mono text-sm">
        {url}
      </code>
      <CopyButton text={url} label={label} />
    </div>
  );
}
