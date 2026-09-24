import { Badge } from "@/components/ui/badge";
import type { Enums } from "@/types/database";

export type LessonStatus = Enums<"lesson_status">;

export const STATUS_LABEL: Record<LessonStatus, string> = {
  scheduled: "Programmata",
  done: "Svolta",
  cancelled: "Annullata",
};

const STATUS_VARIANT = {
  scheduled: "outline",
  done: "secondary",
  cancelled: "destructive",
} as const satisfies Record<LessonStatus, string>;

export function StatusBadge({ status }: { status: LessonStatus }) {
  return <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>;
}
