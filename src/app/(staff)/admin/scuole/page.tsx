import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { createClient } from "@/lib/supabase/server";
import { createSchool } from "./actions";
import { SchoolForm } from "./school-form";

export default async function SchoolsPage() {
  const supabase = await createClient();
  const { data: schools } = await supabase
    .from("schools")
    .select("id, name, unique_code, contact_email, classes(total_enrolled)")
    .order("name");

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Scuole</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nuova scuola</CardTitle>
        </CardHeader>
        <CardContent>
          <SchoolForm action={createSchool} submitLabel="Crea scuola" />
          <p className="mt-2 text-xs text-muted-foreground">
            Il codice di accesso per le maestre viene generato automaticamente.
          </p>
        </CardContent>
      </Card>

      {!schools?.length ? (
        <p className="py-8 text-center text-muted-foreground">Nessuna scuola inserita.</p>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Scuola</TableHead>
                <TableHead>Codice</TableHead>
                <TableHead className="text-right">Classi</TableHead>
                <TableHead className="text-right">Iscritti</TableHead>
                <TableHead className="hidden md:table-cell">Contatto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schools.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">
                    <Link href={`/admin/scuole/${s.id}`} className="underline-offset-4 hover:underline">
                      {s.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{s.unique_code}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.classes.length}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.classes.reduce((sum, c) => sum + c.total_enrolled, 0)}
                  </TableCell>
                  <TableCell className="hidden text-muted-foreground md:table-cell">
                    {s.contact_email ?? "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
