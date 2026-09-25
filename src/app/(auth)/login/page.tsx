import Link from "next/link";
import { redirect } from "next/navigation";

import { BrandHeader } from "@/components/brand";
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
      <div className="flex w-full max-w-sm flex-col gap-6">
        <BrandHeader />
        <Card className="w-full">
          <CardHeader>
            <CardTitle>Area riservata</CardTitle>
            <CardDescription>Accesso per istruttori e amministrazione.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {errore === "non-autorizzato" && (
              <p className="text-sm text-destructive" role="alert">
                Il tuo account non è abilitato. Chiedi un codice di registrazione
                all&apos;amministratore.
              </p>
            )}
            <LoginForm next={typeof next === "string" ? next : undefined} />
            <p className="text-center text-sm text-muted-foreground">
              Hai un codice di registrazione?{" "}
              <Link href="/registrati" className="underline underline-offset-4">
                Registrati
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
