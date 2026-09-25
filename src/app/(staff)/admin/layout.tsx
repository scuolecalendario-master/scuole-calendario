import { Bell } from "lucide-react";
import Link from "next/link";

import { StaffHeader } from "@/components/staff-header";
import { getAdminCounts } from "@/lib/admin-stats";
import { requireRole } from "@/lib/auth";
import { cn } from "@/lib/utils";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireRole("master");
  const { openRequests, toRecord } = await getAdminCounts();

  return (
    <div className="flex flex-1 flex-col">
      <StaffHeader
        title="Amministrazione"
        links={[
          { href: "/admin", label: "Oggi", exact: true, badge: toRecord },
          { href: "/admin/calendario", label: "Calendario" },
          { href: "/admin/programma", label: "Programma" },
          { href: "/admin/richieste", label: "Richieste", badge: openRequests },
          { href: "/admin/scuole", label: "Istituti" },
          { href: "/admin/istruttori", label: "Istruttori" },
          { href: "/admin/report", label: "Report" },
          { href: "/admin/backup", label: "Backup" },
        ]}
        userLabel={profile.full_name ?? profile.email ?? ""}
        actions={
          <Link
            href="/admin/richieste"
            className="relative flex size-11 items-center justify-center rounded-xl hover:bg-white/15"
            aria-label={openRequests ? `${openRequests} richieste di spostamento da leggere` : "Richieste di spostamento"}
          >
            <Bell className={cn("size-6", openRequests > 0 && "fill-sun text-sun")} aria-hidden />
            {openRequests > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-5 rounded-full bg-coral px-1 text-center text-xs leading-5 font-bold text-foreground">
                {openRequests}
              </span>
            )}
          </Link>
        }
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
