import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/server";
import { logout } from "../(auth)/login/actions";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims) redirect("/login");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between p-4">
          <span className="font-semibold">Calendario Scuole · Gestione</span>
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm">
              Esci
            </Button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 p-6">{children}</main>
    </div>
  );
}
