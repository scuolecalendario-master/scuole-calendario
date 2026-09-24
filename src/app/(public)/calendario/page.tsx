import { redirect } from "next/navigation";

import { LessonList } from "@/components/calendar/lesson-list";
import { Button } from "@/components/ui/button";
import { getSchoolCode } from "@/lib/school-code";
import { createSchoolClient } from "@/lib/supabase/server";
import { forgetSchoolCode } from "../actions";

export default async function CalendarioPage() {
  const code = await getSchoolCode();
  if (!code) redirect("/");

  const supabase = createSchoolClient(code);
  const from = new Date();
  from.setHours(0, 0, 0, 0);

  const [{ data: school }, { data: lessons, error }] = await Promise.all([
    supabase.from("schools").select("name").maybeSingle(),
    supabase
      .from("lessons")
      .select("*, classes(name)")
      .gte("starts_at", from.toISOString())
      .order("starts_at")
      .limit(200),
  ]);

  // Codice non più valido (es. rigenerato dalla scuola)
  if (!school) await forgetSchoolCode();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 p-6">
      <header className="mb-8 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Calendario lezioni</p>
          <h1 className="text-2xl font-bold">{school?.name}</h1>
        </div>
        <form action={forgetSchoolCode}>
          <Button type="submit" variant="outline" size="sm">
            Cambia scuola
          </Button>
        </form>
      </header>
      {error ? (
        <p className="text-destructive">Impossibile caricare le lezioni.</p>
      ) : (
        <LessonList lessons={lessons ?? []} />
      )}
    </main>
  );
}
