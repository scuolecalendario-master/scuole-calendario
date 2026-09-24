import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentProfile, homeForRole } from "@/lib/auth";
import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const profile = await getCurrentProfile();
  if (profile?.role) redirect(homeForRole(profile.role));

  const { next, errore } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Area riservata</CardTitle>
          <CardDescription>Accesso per istruttori e amministrazione.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {errore === "non-autorizzato" && (
            <p className="text-sm text-destructive" role="alert">
              Il tuo account non è ancora abilitato. Contatta l&apos;amministratore.
            </p>
          )}
          <LoginForm next={typeof next === "string" ? next : undefined} />
        </CardContent>
      </Card>
    </main>
  );
}
