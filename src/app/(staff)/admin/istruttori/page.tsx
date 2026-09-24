import { ConfirmAction } from "@/components/confirm-action";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";
import { deleteRegistrationCode, revokeAccess } from "./actions";
import { CodeForm } from "./code-form";

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

  const [{ data: staff }, { data: codes }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, email, full_name, role")
      .not("role", "is", null)
      .order("role")
      .order("full_name"),
    supabase
      .from("registration_codes")
      .select("id, code, label, role, expires_at, used_at, profiles!registration_codes_used_by_fkey(email, full_name)")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const now = new Date().toISOString();

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Istruttori e accessi</h1>

      <Card>
        <CardHeader>
          <CardTitle>Nuovo codice di registrazione</CardTitle>
          <CardDescription>
            Il codice vale per una sola registrazione. L&apos;istruttore lo inserisce su{" "}
            <code>/registrati</code> insieme a nome, email e password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CodeForm />
        </CardContent>
      </Card>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Utenti abilitati</h2>
        <div className="rounded-xl border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Ruolo</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff?.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.full_name ?? "—"}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>{p.role && ROLE_LABEL[p.role]}</TableCell>
                  <TableCell className="text-right">
                    {p.id === me.id ? (
                      <span className="text-xs text-muted-foreground">tu</span>
                    ) : (
                      <ConfirmAction
                        action={revokeAccess.bind(null, p.id)}
                        trigger="Revoca"
                        title={`Revocare l'accesso a ${p.full_name ?? p.email}?`}
                        description="Non potrà più entrare nell'area riservata; le lezioni e le presenze registrate restano. Potrai riabilitarlo con un nuovo codice."
                        confirmLabel="Revoca accesso"
                      />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Codici generati</h2>
        {!codes?.length ? (
          <p className="text-sm text-muted-foreground">Nessun codice generato.</p>
        ) : (
          <div className="rounded-xl border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Codice</TableHead>
                  <TableHead>Per</TableHead>
                  <TableHead>Ruolo</TableHead>
                  <TableHead>Stato</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {codes.map((c) => {
                  const expired = !c.used_at && c.expires_at < now;
                  return (
                    <TableRow key={c.id} className={c.used_at || expired ? "text-muted-foreground" : undefined}>
                      <TableCell className="font-mono">{c.code}</TableCell>
                      <TableCell>{c.label ?? "—"}</TableCell>
                      <TableCell>{ROLE_LABEL[c.role]}</TableCell>
                      <TableCell>
                        {c.used_at ? (
                          <Badge variant="secondary">
                            Usato da {c.profiles?.full_name ?? c.profiles?.email ?? "utente eliminato"}
                          </Badge>
                        ) : expired ? (
                          <Badge variant="outline">Scaduto</Badge>
                        ) : (
                          <Badge variant="outline">
                            Valido fino al {dateTime.format(new Date(c.expires_at))}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {!c.used_at && (
                          <ConfirmAction
                            action={deleteRegistrationCode.bind(null, c.id)}
                            trigger="Elimina"
                            title={`Eliminare il codice ${c.code}?`}
                            description="Il codice non potrà più essere usato per registrarsi."
                            confirmLabel="Elimina codice"
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
