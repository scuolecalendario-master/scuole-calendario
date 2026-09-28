"use client";

import { Check, ChevronDown } from "lucide-react";

import { Input } from "@/components/ui/input";
import { LEVEL_STYLE } from "@/lib/colors";
import { focusCatalog, focusLabel, focusNeedsNote, MAX_FOCUS, type SchoolLevel } from "@/lib/focus";
import { cn } from "@/lib/utils";

/**
 * Menù a tendina con i focus del livello della classe (anche più di uno).
 * Sotto il menù restano visibili i focus scelti, come chip colorati.
 */
export function FocusPicker({
  level,
  value,
  note,
  onChange,
  id,
}: {
  level: SchoolLevel;
  value: string[];
  note: string;
  onChange: (focus: string[], note: string) => void;
  id?: string;
}) {
  const catalog = focusCatalog(level);
  const full = value.length >= MAX_FOCUS;

  function toggle(focusId: string) {
    const next = value.includes(focusId) ? value.filter((x) => x !== focusId) : full ? value : [...value, focusId];
    onChange(next, note);
  }

  return (
    <div className="flex flex-col gap-2">
      <details className="group rounded-xl border-2 border-input bg-card open:border-primary">
        <summary
          id={id}
          className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 text-base font-medium [&::-webkit-details-marker]:hidden"
        >
          <span>
            {value.length === 0 ? "Scegli i focus" : value.length === 1 ? "1 focus scelto" : `${value.length} focus scelti`}
          </span>
          <ChevronDown className="size-5 transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <ul className="flex flex-col border-t-2 border-border py-1">
          {catalog.map((f) => {
            const checked = value.includes(f.id);
            return (
              <li key={f.id}>
                <label
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted",
                    !checked && full && "cursor-not-allowed opacity-60",
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-5 shrink-0 accent-primary"
                    checked={checked}
                    disabled={!checked && full}
                    onChange={() => toggle(f.id)}
                  />
                  <span className="flex flex-col">
                    <span className="font-medium">{f.label}</span>
                    {f.description && <span className="text-sm text-muted-foreground">{f.description}</span>}
                  </span>
                </label>
              </li>
            );
          })}
          {full && <li className="px-3 py-2 text-sm text-muted-foreground">Massimo {MAX_FOCUS} focus.</li>}
        </ul>
      </details>

      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Focus scelti">
          {value.map((f) => (
            <li
              key={f}
              className={cn("flex items-center gap-1 rounded-full px-3 py-1 text-sm font-semibold", LEVEL_STYLE[level].solid)}
            >
              <Check className="size-4" aria-hidden />
              {focusLabel(f, note)}
            </li>
          ))}
        </ul>
      )}

      {focusNeedsNote(level, value) && (
        <Input
          value={note}
          onChange={(e) => onChange(value, e.target.value)}
          placeholder="Gioco con… (es. palline, tubi, tappeto)"
          maxLength={200}
          className="h-11 text-base"
          aria-label="Gioco con"
        />
      )}
    </div>
  );
}
