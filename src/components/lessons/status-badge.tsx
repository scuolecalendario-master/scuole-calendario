import { Check, Clock, X, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";

export type LessonStatus = Enums<"lesson_status">;

export const STATUS_LABEL: Record<LessonStatus, string> = {
  scheduled: "Programmata",
  done: "Svolta",
  cancelled: "Annullata",
};

export const STATUS_ICON: Record<LessonStatus, LucideIcon> = {
  scheduled: Clock,
  done: Check,
  cancelled: X,
};

// Classi statiche (Tailwind non genera classi composte a runtime). Vedi DESIGN.md §3.
const SOFT: Record<LessonStatus, string> = {
  scheduled: "bg-scheduled-soft text-scheduled-text",
  done: "bg-done-soft text-done-text",
  cancelled: "bg-cancelled-soft text-cancelled-text",
};
const SOLID: Record<LessonStatus, string> = {
  scheduled: "bg-scheduled text-white",
  done: "bg-done text-white",
  cancelled: "bg-cancelled text-white",
};

/** Stato della lezione: sempre icona + parola, mai solo colore. */
export function StatusBadge({
  status,
  solid = false,
  className,
}: {
  status: LessonStatus;
  /** Pieno per lo stato in evidenza, tenue (default) negli elenchi. */
  solid?: boolean;
  className?: string;
}) {
  const Icon = STATUS_ICON[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        solid ? SOLID[status] : SOFT[status],
        className,
      )}
    >
      <Icon className="size-3.5" strokeWidth={3} aria-hidden />
      {STATUS_LABEL[status]}
    </span>
  );
}
