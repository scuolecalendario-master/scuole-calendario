import { InstallBanner } from "@/components/install/install-banner";
import { StaffHeader } from "@/components/staff-header";
import { requireRole } from "@/lib/auth";

export default async function InstructorLayout({ children }: LayoutProps<"/istruttore">) {
  const profile = await requireRole("instructor", "master");
  const isMaster = profile.role === "master";

  return (
    <div className="flex flex-1 flex-col">
      <StaffHeader
        title={isMaster ? "Le mie lezioni" : "Istruttore"}
        homeHref={isMaster ? "/admin" : "/istruttore/oggi"}
        links={[
          { href: "/istruttore/oggi", label: "Oggi" },
          { href: "/istruttore/calendario", label: "Calendario" },
          ...(isMaster ? [{ href: "/admin", label: "← Pannello" }] : []),
        ]}
        userLabel={profile.full_name ?? profile.email ?? ""}
      />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        {children}
        {/* In fondo: mai sopra l'informazione chiave (DESIGN.md §6) */}
        <InstallBanner text="Apri l'app con un tocco dalla Home." className="mt-8" />
      </main>
    </div>
  );
}
