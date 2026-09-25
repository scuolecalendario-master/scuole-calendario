import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { classColor } from "@/lib/colors";
import { formatCompact, formatTime, relativeDay } from "@/lib/dates";
import { LEVEL_LABEL } from "@/lib/focus";
import { getPortalSchool } from "@/lib/portal";
import { InstallBanner } from "@/components/install/install-banner";
import { OpenRememberedClass } from "./remember-class";

// Il codice è una credenziale: la pagina non va indicizzata.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SchoolPortalPage({ params, searchParams }: PageProps<"/scuola/[code]">) {
  const { code, school, supabase } = await getPortalSchool((await params).code);
  const { scegli } = await searchParams;

  const [{ data: sites }, { data: classes }, { data: next }] = await Promise.all([
    supabase.from("sites").select("id, name").order("name"),
    supabase.from("classes").select("id, grade_name, level, site_id").order("grade_name"),
    supabase.rpc("next_lessons"),
  ]);

  const nextByClass = new Map((next ?? []).map((n) => [n.class_id, n]));
  const allClasses = classes ?? [];
  const groups = [
    ...(sites ?? []).map((s) => ({ key: s.id, title: s.name, classes: allClasses.filter((c) => c.site_id === s.id) })),
    { key: "other", title: sites?.length ? "Altre classi" : null, classes: allClasses.filter((c) => !c.site_id) },
  ].filter((g) => g.classes.length > 0);

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6 sm:px-6">
      {!scegli && <OpenRememberedClass code={code} classIds={allClasses.map((c) => c.id)} />}

      <header className="mb-6">
        <p className="text-sm font-semibold text-primary">Lezioni di nuoto</p>
        <h1 className="text-2xl font-bold">{school.name}</h1>
        <p className="mt-1 text-muted-foreground">Tocca la tua classe: la ricorderemo per la prossima volta.</p>
      </header>

      <InstallBanner text="Apri il calendario con un tocco dalla Home." className="mb-6" />

      {groups.length === 0 ? (
        <p className="py-12 text-center text-muted-foreground">Nessuna classe inserita per ora.</p>
      ) : (
        <div className="flex flex-col gap-8">
          {groups.map((g) => (
            <section key={g.key} className="flex flex-col gap-3">
              {g.title && <h2 className="text-lg font-bold">{g.title}</h2>}
              <ul className="grid gap-3 sm:grid-cols-2">
                {g.classes.map((c) => {
                  const n = nextByClass.get(c.id);
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/scuola/${code}/classe/${c.id}`}
                        className="flex min-h-24 items-center gap-3 rounded-2xl p-4 text-white shadow-sm transition-transform active:scale-[0.98]"
                        style={{ backgroundColor: classColor(c.id) }}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-2xl leading-tight font-bold">
                            {c.grade_name}{" "}
                            <span className="text-sm font-semibold opacity-90">{LEVEL_LABEL[c.level]}</span>
                          </p>
                          <p className="mt-1 font-medium">
                            {n ? (
                              <>
                                Prossima: {formatCompact(n.date)} · {formatTime(n.start_time)}
                                <span className="block text-sm opacity-90">{relativeDay(n.date)}</span>
                              </>
                            ) : (
                              "Nessuna lezione in programma"
                            )}
                          </p>
                        </div>
                        <ChevronRight className="size-7 shrink-0" aria-hidden />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
