import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getCurrentProfile, homeForRole } from "@/lib/auth";
import { RegisterForm } from "./register-form";

export default async function RegisterPage({ searchParams }: PageProps<"/registrati">) {
  const profile = await getCurrentProfile();
  if (profile?.role) redirect(homeForRole(profile.role));

  // Il master può condividere un link con il codice già compilato: /registrati?codice=...
  const { codice } = await searchParams;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Registrazione istruttori</CardTitle>
          <CardDescription>
            Inserisci il codice ricevuto dall&apos;amministratore e scegli le tue credenziali.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <RegisterForm code={typeof codice === "string" ? codice.slice(0, 40) : undefined} />
          <p className="text-center text-sm text-muted-foreground">
            Hai già un account?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Accedi
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
