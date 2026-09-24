import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SchoolCodeForm } from "./school-code-form";

export default function HomePage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Calendario lezioni di nuoto</CardTitle>
          <CardDescription>
            Inserisci il codice della tua scuola per consultare il calendario.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <SchoolCodeForm />
          <p className="text-center text-sm text-muted-foreground">
            Istruttori e amministrazione:{" "}
            <Link href="/login" className="underline underline-offset-4">
              Accedi
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
