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
import { PasswordForm } from "./password-form";

export default async function PasswordPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login?next=/password");
  if (!profile.role) redirect(homeForRole(null));

  const temporary = profile.must_change_password;

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{temporary ? "Scegli una nuova password" : "Cambia password"}</CardTitle>
          <CardDescription>
            {temporary
              ? "Stai usando una password temporanea: per continuare scegline una tua."
              : profile.email}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <PasswordForm temporary={temporary} />
          {!temporary && (
            <Link
              href={homeForRole(profile.role)}
              className="text-center text-sm text-muted-foreground underline underline-offset-4"
            >
              Annulla
            </Link>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
