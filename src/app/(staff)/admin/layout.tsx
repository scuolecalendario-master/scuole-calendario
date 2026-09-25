import { StaffHeader } from "@/components/staff-header";
import { requireRole } from "@/lib/auth";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const profile = await requireRole("master");

  return (
    <div className="flex flex-1 flex-col">
      <StaffHeader
        title="Amministrazione"
        links={[
          { href: "/admin/calendario", label: "Calendario" },
          { href: "/admin/report", label: "Report" },
          { href: "/admin/scuole", label: "Istituti" },
          { href: "/admin/istruttori", label: "Istruttori" },
        ]}
        userLabel={profile.full_name ?? profile.email ?? ""}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
