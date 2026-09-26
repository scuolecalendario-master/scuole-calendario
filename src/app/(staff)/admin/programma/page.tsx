import Link from "next/link";

import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { orThrow } from "@/lib/db";
import { CourseForm } from "./course-form";

export default async function ProgramPage() {
  await requireRole("master");
  const supabase = await createClient();
  const schools = orThrow(
    await supabase
      .from("schools")
      .select("id, name, sites(id, name), classes(id, grade_name, level, total_enrolled, site_id)")
      .order("name")
      .order("grade_name", { referencedTable: "classes" }),
  );

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold">Programma un corso</h1>
        <p className="text-muted-foreground">
          Scegli la classe, i giorni e l&apos;orario: le lezioni vengono create per tutto il periodo.
        </p>
      </div>
      {!schools?.length ? (
        <p className="text-muted-foreground">
          Prima crea un istituto in{" "}
          <Link href="/admin/scuole" className="font-semibold text-primary underline">
            Istituti
          </Link>
          .
        </p>
      ) : (
        <CourseForm schools={schools} />
      )}
    </div>
  );
}
