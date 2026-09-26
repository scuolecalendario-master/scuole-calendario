import Link from "next/link";
import { notFound } from "next/navigation";

import { ConfirmAction } from "@/components/confirm-action";
import { CopyLink } from "@/components/copy-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { orThrow } from "@/lib/db";
import {
  createClass,
  createSite,
  deleteClass,
  deleteSchool,
  deleteSite,
  regenerateSchoolCode,
  renameSite,
  updateClass,
  updateSchool,
} from "../actions";
import { SchoolForm } from "../school-form";
import { ChangeRequestsToggle } from "./change-requests-toggle";
import { ClassRow, NewClassForm, type ClassData } from "./class-forms";
import { NewSiteForm, SiteHeader } from "./site-forms";

export default async function SchoolDetailPage({ params }: PageProps<"/admin/scuole/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const supabase = await createClient();
  const [school, staff] = await Promise.all([
    supabase
      .from("schools")
      .select(
        "id, name, unique_code, contact_email, change_requests_enabled, sites(id, name), classes(id, grade_name, total_enrolled, level, site_id, lessons(count), class_instructors(profile_id))",
      )
      .eq("id", id)
      .order("name", { referencedTable: "sites" })
      .order("grade_name", { referencedTable: "classes" })
      .maybeSingle()
      .then(orThrow),
    supabase
      .from("profiles")
      .select("id, full_name, email")
      .not("role", "is", null)
      .order("full_name")
      .then(orThrow),
  ]);

  if (!school) notFound();

  const sites = school.sites;
  const instructors = (staff ?? []).map((p) => ({ id: p.id, name: p.full_name ?? p.email ?? "—" }));
  const classes: ClassData[] = school.classes.map((c) => ({
    id: c.id,
    grade_name: c.grade_name,
    total_enrolled: c.total_enrolled,
    level: c.level,
    site_id: c.site_id,
    instructorIds: c.class_instructors.map((ci) => ci.profile_id),
    lessonsCount: c.lessons[0]?.count ?? 0,
  }));
  const totalLessons = classes.reduce((n, c) => n + c.lessonsCount, 0);
  const options = { sites, instructors };

  // Gruppi: un gruppo per plesso, poi le classi senza plesso
  const groups = [
    ...sites.map((s) => ({ site: s, classes: classes.filter((c) => c.site_id === s.id) })),
    { site: null, classes: classes.filter((c) => !c.site_id) },
  ].filter((g) => g.site || g.classes.length > 0);

  const classRow = (c: ClassData) => (
    <ClassRow
      key={c.id}
      data={c}
      classPath={`/scuola/${school.unique_code}/classe/${c.id}`}
      updateAction={updateClass.bind(null, c.id)}
      deleteAction={deleteClass.bind(null, c.id)}
      {...options}
    />
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href="/admin/scuole" className="text-sm font-medium text-primary hover:underline">
          ← Tutti gli istituti
        </Link>
        <h1 className="text-2xl font-bold">{school.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Accesso maestre</CardTitle>
          <CardDescription>
            Un solo link per tutto l&apos;istituto (codice{" "}
            <code className="font-mono">{school.unique_code}</code>). Ogni classe ha anche un link
            diretto: usa &quot;Copia link classe&quot; qui sotto.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CopyLink path={`/scuola/${school.unique_code}`} />
          <ChangeRequestsToggle schoolId={school.id} enabled={school.change_requests_enabled} />
          <div>
            <ConfirmAction
              action={regenerateSchoolCode.bind(null, school.id)}
              trigger="Rigenera codice"
              title="Rigenerare il codice?"
              description="Il link e il codice attuali (anche i link delle singole classi) smetteranno di funzionare: dovrai inviare quelli nuovi alle maestre."
              confirmLabel="Rigenera"
              destructive={false}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Plessi e classi</CardTitle>
          <CardDescription>
            Il livello decide i focus disponibili per gli istruttori; gli iscritti servono per
            presenze e frequenza. Solo gli istruttori scelti possono registrare le lezioni della
            classe.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          {groups.map((g) => (
            <section key={g.site?.id ?? "none"} className="flex flex-col gap-3">
              {g.site ? (
                <SiteHeader
                  name={g.site.name}
                  classCount={g.classes.length}
                  renameAction={renameSite.bind(null, g.site.id)}
                  deleteAction={deleteSite.bind(null, g.site.id)}
                />
              ) : (
                <h3 className="text-lg font-semibold">{sites.length ? "Classi senza plesso" : "Classi"}</h3>
              )}
              {g.classes.length > 0 ? (
                <ul className="flex flex-col gap-2">{g.classes.map(classRow)}</ul>
              ) : (
                <p className="text-sm text-muted-foreground">Nessuna classe in questo plesso.</p>
              )}
            </section>
          ))}

          <NewClassForm action={createClass.bind(null, school.id)} {...options} />
          <NewSiteForm action={createSite.bind(null, school.id)} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dati istituto</CardTitle>
        </CardHeader>
        <CardContent>
          <SchoolForm action={updateSchool.bind(null, school.id)} defaults={school} submitLabel="Salva" />
        </CardContent>
      </Card>

      <Card className="ring-destructive/40">
        <CardHeader>
          <CardTitle>Elimina istituto</CardTitle>
          <CardDescription>
            Elimina l&apos;istituto con plessi, classi e lezioni. L&apos;operazione non è reversibile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ConfirmAction
            action={deleteSchool.bind(null, school.id)}
            trigger="Elimina istituto"
            title={`Eliminare ${school.name}?`}
            description={`Verranno eliminati ${sites.length} plessi, ${classes.length} classi e ${totalLessons} lezioni, comprese presenze e focus. L'operazione non è reversibile.`}
            confirmLabel="Elimina definitivamente"
          />
        </CardContent>
      </Card>
    </div>
  );
}
