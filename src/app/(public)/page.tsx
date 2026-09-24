import Link from "next/link";
import { redirect } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSchoolCode } from "@/lib/school-code";
import { SchoolCodeForm } from "./school-code-form";

export default async function HomePage() {
  if (await getSchoolCode()) redirect("/calendario");

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Calendario lezioni</CardTitle>
          <CardDescription>
            Inserisci il codice fornito dalla tua scuola per vedere l&apos;orario.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SchoolCodeForm />
          <p className="text-center text-sm text-muted-foreground">
            Personale scolastico?{" "}
            <Link href="/login" className="underline underline-offset-4">
              Accedi
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
