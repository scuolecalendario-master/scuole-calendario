import { LessonList } from "@/components/calendar/lesson-list";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, schools(name, access_code)")
    .eq("id", claims!.claims.sub)
    .maybeSingle();

  if (!profile?.schools) {
    return (
      <p className="text-muted-foreground">
        Il tuo account non è ancora associato a una scuola. Contatta un
        amministratore.
      </p>
    );
  }

  const { data: lessons } = await supabase
    .from("lessons")
    .select("*, classes(name)")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(50);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{profile.schools.name}</h1>
        <Badge variant="outline">{profile.role}</Badge>
        <span className="text-sm text-muted-foreground">
          Codice scuola:{" "}
          <code className="font-mono">{profile.schools.access_code}</code>
        </span>
      </div>
      <LessonList lessons={lessons ?? []} />
    </div>
  );
}
