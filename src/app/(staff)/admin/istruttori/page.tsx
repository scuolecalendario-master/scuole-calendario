import { KeyRound, UserRound } from "lucide-react";
import Link from "next/link";

import { ConfirmAction } from "@/components/confirm-action";
import { requireRole } from "@/lib/auth";
import { classColor } from "@/lib/colors";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import type { Enums } from "@/types/database";
import { orThrow } from "@/lib/db";
import { deleteRegistrationCode, revokeAccess } from "./actions";
import { CodeForm } from "./code-form";
import { ResetPasswordButton } from "./reset-password";

const ROLE_LABEL: Record<Enums<"user_role">, string> = {
  instructor: "Istruttore",
  master: "Master",
};

const dateTime = new Intl.DateTimeFormat("it-IT", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

export default async function StaffPage() {
  const me = await requireRole("master");
  const supabase = await createClient();

  const [staff, codes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role, class_instructors(classes(id, grade_name, school_id, schools(name)))")
      .not("role", "is", null)
      .order("role", { ascending: false })
      .order("full_name")
      .then(orThrow),
    supabase
      .from("registration_codes")
      .select("id, code, label, role, expires_at, used_at, profiles!registration_codes_used_by_fkey(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(orThrow),
  ]);

  const now = new Date().toISOString();
  const openCodes = (codes ?? []).filter((c) => !c.used_at && c.expires_at >= now);
  const pastCodes = (codes ?? []).filter((c) => c.used_at || c.expires_at < now);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Istruttori e accessi</h1>

      {/* Nuovo codice */}
      <section className="flex flex-col gap-3 rounded-3xl border-2 border-primary bg-card p-4">
        <h2 className="flex items-center gap-2 text-lg font-bold">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <KeyRound className="size-5" aria-hidden />
          </span>
          Nuovo codice di registrazione
        </h2>
        <p className="text-muted-foreground">
          Il codice vale per una sola registrazione: l&apos;istruttore lo inserisce su <code>/registrati</code> con nome,
          email e password.
        </p>
        <CodeForm />
      </section>

      {/* Persone */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Persone abilitate ({staff?.length ?? 0})</h2>
        <ul className="grid gap-3 md:grid-cols-2">
          {staff?.map((p) => {
            const classes = p.class_instructors.map((ci) => ci.classes).filter((c) => c !== null);
            return (
              <li key={p.id} className="flex min-w-0 flex-col gap-3 rounded-2xl border-2 bg-card p-4">
                <div className="flex items-start gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary">
                    <UserRound className="size-6 text-primary" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-lg font-bold">{p.full_name ?? "—"}</p>
                    <p className="truncate text-sm text-muted-foreground">{p.email}</p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold",
                      p.role === "master" ? "bg-sun text-foreground" : "bg-scheduled-soft text-scheduled-text",
                    )}
                  >
                    {p.role && ROLE_LABEL[p.role]}
                    {p.id === me.id && " · tu"}
                  </span>
                </div>

                {p.role === "instructor" &&
                  (classes.length ? (
                    <ul className="flex flex-wrap gap-1.5" aria-label="Classi assegnate">
                      {classes.map((c) => (
                        <li key={c.id}>
                          <Link
                            href={`/admin/scuole/${c.school_id}`}
                            className="flex min-h-9 items-center rounded-full px-3 text-sm font-semibold text-white"
                            style={{ backgroundColor: classColor(c.id) }}
                          >
                            {c.grade_name} · {c.schools?.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="rounded-xl bg-sun/25 px-3 py-2 text-sm font-medium">
                      Nessuna classe assegnata: assegnala dalla pagina dell&apos;istituto.
                    </p>
                  ))}

                {p.id !== me.id && (
                  <div className="flex flex-wrap gap-2">
                    <ResetPasswordButton profileId={p.id} name={p.full_name ?? p.email ?? "utente"} />
                    <ConfirmAction
                      action={revokeAccess.bind(null, p.id)}
                      trigger="Revoca accesso"
                      title={`Revocare l'accesso a ${p.full_name ?? p.email}?`}
                      description="Non potrà più entrare nell'area riservata; lezioni e presenze registrate restano. Potrai riabilitarlo con un nuovo codice."
                      confirmLabel="Revoca accesso"
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Codici */}
      <section className="flex flex-col gap-3">
        <h2 className="text-xl font-bold">Codici non ancora usati ({openCodes.length})</h2>
        {openCodes.length === 0 ? (
          <p className="text-muted-foreground">Nessun codice in attesa.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {openCodes.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-3 rounded-2xl border-2 bg-card p-3">
                <code className="font-mono text-lg font-bold">{c.code}</code>
                <span className="font-medium">{c.label ?? "—"}</span>
                <span className="rounded-full bg-scheduled-soft px-2.5 py-0.5 text-xs font-bold text-scheduled-text">
                  {ROLE_LABEL[c.role]} · valido fino al {dateTime.format(new Date(c.expires_at))}
                </span>
                <span className="ml-auto">
                  <ConfirmAction
                    action={deleteRegistrationCode.bind(null, c.id)}
                    trigger="Elimina"
                    title={`Eliminare il codice ${c.code}?`}
                    description="Il codice non potrà più essere usato per registrarsi."
                    confirmLabel="Elimina codice"
                  />
                </span>
              </li>
            ))}
          </ul>
        )}

        {pastCodes.length > 0 && (
          <details className="rounded-2xl border-2 bg-card p-3">
            <summary className="min-h-11 cursor-pointer content-center font-semibold">
              Codici usati o scaduti ({pastCodes.length})
            </summary>
            <ul className="mt-2 flex flex-col gap-1.5 text-sm">
              {pastCodes.map((c) => (
                <li key={c.id} className="flex flex-wrap items-center gap-2">
                  <code className="font-mono">{c.code}</code>
                  <span className="text-muted-foreground">{c.label ?? ""}</span>
                  {c.used_at ? (
                    <span className="rounded-full bg-done-soft px-2 py-0.5 text-xs font-bold text-done-text">
                      Usato da {c.profiles?.full_name ?? c.profiles?.email ?? "utente eliminato"}
                    </span>
                  ) : (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold">Scaduto</span>
                  )}
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>
    </div>
  );
}
