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
import { orThrow } from "@/lib/db";
import { createSchool } from "./actions";
import { SchoolForm } from "./school-form";

export default async function SchoolsPage() {
  const supabase = await createClient();
  const schools = orThrow(
    await supabase
      .from("schools")
      .select("id, name, unique_code, contact_email, change_requests_enabled, sites(count), classes(total_enrolled)")
      .order("name"),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Istituti</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nuovo istituto</CardTitle>
        </CardHeader>
        <CardContent>
          <SchoolForm action={createSchool} submitLabel="Crea istituto" />
          <p className="mt-2 text-xs text-muted-foreground">
            Il codice di accesso per le maestre viene generato automaticamente. Plessi e classi si aggiungono nella pagina dell&apos;istituto.
          </p>
        </CardContent>
      </Card>

      {!schools?.length ? (
        <p className="py-8 text-center text-muted-foreground">Nessun istituto inserito.</p>
      ) : (
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Istituto</TableHead>
                <TableHead>Codice</TableHead>
                <TableHead className="text-right">Plessi</TableHead>
                <TableHead className="text-right">Classi</TableHead>
                <TableHead className="text-right">Iscritti</TableHead>
                <TableHead>Richieste</TableHead>
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
                  <TableCell className="text-right tabular-nums">{s.sites[0]?.count ?? 0}</TableCell>
                  <TableCell className="text-right tabular-nums">{s.classes.length}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.classes.reduce((sum, c) => sum + c.total_enrolled, 0)}
                  </TableCell>
                  <TableCell>
                    {s.change_requests_enabled ? (
                      <span className="rounded-full bg-done-soft px-2 py-0.5 text-xs font-bold text-done-text">Sì</span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">No</span>
                    )}
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
