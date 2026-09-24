import { StaffHeader } from "@/components/staff-header";
import { requireRole } from "@/lib/auth";

export default async function InstructorLayout({ children }: LayoutProps<"/istruttore">) {
  const profile = await requireRole("instructor", "master");

  return (
    <div className="flex flex-1 flex-col">
      <StaffHeader
        title="Istruttore"
        links={[
          { href: "/istruttore/oggi", label: "Oggi" },
          { href: "/istruttore/calendario", label: "Calendario" },
        ]}
        userLabel={profile.full_name ?? profile.email ?? ""}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">{children}</main>
    </div>
  );
}
