import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Tables } from "@/types/database";

export type LessonWithClass = Tables<"lessons"> & {
  classes: Pick<Tables<"classes">, "name"> | null;
};

const dayFormat = new Intl.DateTimeFormat("it-IT", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Rome",
});
const timeFormat = new Intl.DateTimeFormat("it-IT", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export function LessonList({ lessons }: { lessons: LessonWithClass[] }) {
  if (lessons.length === 0) {
    return (
      <p className="py-12 text-center text-muted-foreground">
        Nessuna lezione in programma.
      </p>
    );
  }

  const byDay = Map.groupBy(lessons, (l) => dayFormat.format(new Date(l.starts_at)));

  return (
    <div className="flex flex-col gap-8">
      {[...byDay].map(([day, items]) => (
        <section key={day}>
          <h2 className="mb-2 text-lg font-semibold capitalize">{day}</h2>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">Orario</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Materia</TableHead>
                <TableHead>Docente</TableHead>
                <TableHead>Aula</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="tabular-nums">
                    {timeFormat.format(new Date(l.starts_at))}–
                    {timeFormat.format(new Date(l.ends_at))}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{l.classes?.name ?? "—"}</Badge>
                  </TableCell>
                  <TableCell className="font-medium">{l.subject}</TableCell>
                  <TableCell>{l.teacher ?? "—"}</TableCell>
                  <TableCell>{l.room ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </section>
      ))}
    </div>
  );
}
