import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/confirm-action";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import {
  createClass,
  deleteClass,
  deleteSchool,
  regenerateSchoolCode,
  updateClass,
  updateSchool,
} from "../actions";
import { SchoolForm } from "../school-form";
import { ClassRow, NewClassForm } from "./class-forms";
import { CopyLink } from "@/components/copy-button";

export default async function SchoolDetailPage({ params }: PageProps<"/admin/scuole/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const { data: school } = await supabase
    .from("schools")
    .select("id, name, unique_code, contact_email, classes(id, grade_name, total_enrolled, lessons(count))")
    .eq("id", id)
    .order("grade_name", { referencedTable: "classes" })
    .maybeSingle();

  if (!school) notFound();

  const totalLessons = school.classes.reduce((n, c) => n + (c.lessons[0]?.count ?? 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/scuole" className="text-sm text-muted-foreground hover:underline">
          ← Tutte le scuole
        </Link>
        <h1 className="text-2xl font-bold">{school.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accesso maestre</CardTitle>
          <CardDescription>
            Condividi questo link (o il codice <code className="font-mono">{school.unique_code}</code>)
            con le maestre: vedranno il calendario della scuola in sola lettura.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CopyLink path={`/scuola/${school.unique_code}`} />
          <div>
            <ConfirmAction
              action={regenerateSchoolCode.bind(null, school.id)}
              trigger="Rigenera codice"
              title="Rigenerare il codice?"
              description="Il link e il codice attuali smetteranno di funzionare: dovrai inviare quelli nuovi alle maestre. Utile se il codice è stato condiviso per errore."
              confirmLabel="Rigenera"
              destructive={false}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dati scuola</CardTitle>
        </CardHeader>
        <CardContent>
          <SchoolForm
            action={updateSchool.bind(null, school.id)}
            defaults={school}
            submitLabel="Salva"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classi</CardTitle>
          <CardDescription>
            Il numero di iscritti è usato per calcolare la frequenza e per validare le presenze.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {school.classes.length > 0 && (
            <ul className="flex flex-col gap-2">
              {school.classes.map((c) => (
                <ClassRow
                  key={`${c.id}-${c.grade_name}-${c.total_enrolled}`}
                  gradeName={c.grade_name}
                  totalEnrolled={c.total_enrolled}
                  lessonsCount={c.lessons[0]?.count ?? 0}
                  updateAction={updateClass.bind(null, c.id)}
                  deleteAction={deleteClass.bind(null, c.id)}
                />
              ))}
            </ul>
          )}
          <NewClassForm action={createClass.bind(null, school.id)} />
        </CardContent>
      </Card>

      <Card className="ring-destructive/30">
        <CardHeader>
          <CardTitle>Elimina scuola</CardTitle>
          <CardDescription>
            Elimina la scuola con tutte le sue classi e lezioni. L&apos;operazione non è reversibile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmAction
            action={deleteSchool.bind(null, school.id)}
            trigger="Elimina scuola"
            title={`Eliminare ${school.name}?`}
            description={`Verranno eliminate ${school.classes.length} classi e ${totalLessons} lezioni, comprese presenze e note. L'operazione non è reversibile.`}
            confirmLabel="Elimina definitivamente"
          />
        </CardContent>
      </Card>
    </div>
  );
}
