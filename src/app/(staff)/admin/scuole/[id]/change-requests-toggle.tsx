"use client";

import { CalendarClock } from "lucide-react";
import { useOptimistic, useTransition } from "react";

import { cn } from "@/lib/utils";
import { setChangeRequestsEnabled } from "../actions";

/** Interruttore: le maestre di questo istituto possono chiedere spostamenti? */
export function ChangeRequestsToggle({ schoolId, enabled }: { schoolId: string; enabled: boolean }) {
  const [optimistic, setOptimistic] = useOptimistic(enabled);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      setOptimistic(!optimistic);
      await setChangeRequestsEnabled(schoolId, !optimistic);
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border-2 p-3">
      <CalendarClock className="size-6 shrink-0 text-primary" aria-hidden />
      <div className="min-w-0 flex-1">
        <p id={`cr-${schoolId}`} className="font-semibold">
          Richieste di spostamento
        </p>
        <p className="text-sm text-muted-foreground">
          {optimistic
            ? "Le maestre vedono “Chiedi uno spostamento” sulle lezioni."
            : "Disattivate: le maestre non possono chiedere spostamenti."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={optimistic}
        aria-labelledby={`cr-${schoolId}`}
        onClick={toggle}
        disabled={pending}
        // Area di tocco 44 px (DESIGN.md), interruttore disegnato più piccolo
        className="flex h-11 w-16 shrink-0 items-center justify-center disabled:opacity-60"
      >
        <span
          className={cn(
            "relative inline-flex h-8 w-14 items-center rounded-full border-2 transition-colors",
            optimistic ? "border-done bg-done" : "border-border bg-muted",
          )}
        >
          <span
            className={cn(
              "inline-block size-6 rounded-full bg-white shadow transition-transform",
              optimistic ? "translate-x-6" : "translate-x-0.5",
            )}
          />
        </span>
        <span className="sr-only">{optimistic ? "Attive" : "Disattivate"}</span>
      </button>
    </div>
  );
}
