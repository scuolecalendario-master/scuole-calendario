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
import { formatDate } from "@/lib/dates";
import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";
import { revokeStaff } from "./actions";
import { InviteForm } from "./invite-form";

const ROLE_LABEL: Record<Enums<"user_role">, string> = {
  instructor: "Istruttore",
  master: "Master",
};

type StaffRow = {
  email: string;
  fullName: string | null;
  role: Enums<"user_role">;
  invitedAt: string | null;
  active: boolean;
  revocable: boolean;
};

export default async function StaffPage() {
  const me = await requireRole("master");
  const supabase = await createClient();

  const [{ data: invites }, { data: profiles }] = await Promise.all([
    supabase.from("staff_invites").select("email, full_name, role, created_at"),
    supabase.from("profiles").select("email, full_name, role").not("role", "is", null),
  ]);

  // Unisce inviti (email abilitate) e profili attivi; chi non ha invito
  // (es. il master iniziale) è mostrato ma non è revocabile da qui.
  const rows = new Map<string, StaffRow>();
  for (const i of invites ?? []) {
    rows.set(i.email, {
      email: i.email,
      fullName: i.full_name,
      role: i.role,
      invitedAt: i.created_at.slice(0, 10),
      active: false,
      revocable: i.email !== me.email,
    });
  }
  for (const p of profiles ?? []) {
    if (!p.email || !p.role) continue;
    const row = rows.get(p.email);
    rows.set(p.email, {
      email: p.email,
      fullName: p.full_name ?? row?.fullName ?? null,
      role: p.role,
      invitedAt: row?.invitedAt ?? null,
      active: true,
      revocable: !!row && p.email !== me.email,
    });
  }
  const staff = [...rows.values()].sort(
    (a, b) => a.role.localeCompare(b.role) || a.email.localeCompare(b.email),
  );

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold">Istruttori e accessi</h1>

      <Card>
        <CardHeader>
          <CardTitle>Abilita un&apos;email</CardTitle>
          <CardDescription>
            L&apos;istruttore accede da <code>/login</code> ricevendo un codice via email: al primo
            accesso l&apos;account viene creato con il ruolo scelto.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <InviteForm />
        </CardContent>
      </Card>

      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead className="hidden sm:table-cell">Nome</TableHead>
              <TableHead>Ruolo</TableHead>
              <TableHead>Stato</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff.map((s) => (
              <TableRow key={s.email}>
                <TableCell className="font-medium">{s.email}</TableCell>
                <TableCell className="hidden sm:table-cell">{s.fullName ?? "—"}</TableCell>
                <TableCell>{ROLE_LABEL[s.role]}</TableCell>
                <TableCell>
                  {s.active ? (
                    <Badge variant="secondary">Attivo</Badge>
                  ) : (
                    <Badge variant="outline" title={s.invitedAt ? `Abilitato il ${formatDate(s.invitedAt)}` : undefined}>
                      In attesa del primo accesso
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {s.revocable ? (
                    <ConfirmAction
                      action={revokeStaff.bind(null, s.email)}
                      trigger="Revoca"
                      title={`Revocare l'accesso a ${s.email}?`}
                      description="Non potrà più entrare nell'area riservata. Le lezioni e le presenze già registrate restano."
                      confirmLabel="Revoca accesso"
                    />
                  ) : (
                    s.email === me.email && <span className="text-xs text-muted-foreground">tu</span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
