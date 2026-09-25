import { Download } from "lucide-react";

import { listBackups } from "@/lib/backup";
import { BackupNowButton } from "./backup-button";

const dateTime = new Intl.DateTimeFormat("it-IT", {
  weekday: "short",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Europe/Rome",
});

function formatSize(bytes: number | null) {
  if (bytes == null) return "";
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default async function BackupPage() {
  let backups: Awaited<ReturnType<typeof listBackups>> = [];
  let unavailable = false;
  try {
    backups = await listBackups();
  } catch {
    unavailable = true;
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-5">
      <div>
        <h1 className="text-2xl font-bold">Backup</h1>
        <p className="text-muted-foreground">
          Ogni notte viene salvata una copia completa dei dati (istituti, classi, lezioni, presenze, focus, richieste).
          Restano disponibili 60 giorni. Una volta al mese scaricane una copia sul tuo computer.
        </p>
      </div>

      <BackupNowButton />

      {unavailable ? (
        <p className="rounded-2xl bg-cancelled-soft p-4 font-medium text-cancelled-text">
          Backup non disponibili: manca la chiave segreta di Supabase sul server.
        </p>
      ) : backups.length === 0 ? (
        <p className="rounded-2xl border-2 border-dashed p-6 text-center text-muted-foreground">
          Nessun backup ancora: il primo verrà creato stanotte, oppure crealo ora.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {backups.map((b, i) => (
            <li key={b.name} className="flex items-center gap-3 rounded-2xl border-2 bg-card p-3">
              <div className="min-w-0 flex-1">
                <p className="font-semibold capitalize">
                  {b.createdAt ? dateTime.format(new Date(b.createdAt)) : b.name}
                  {i === 0 && <span className="ml-2 rounded-full bg-done-soft px-2 py-0.5 text-xs font-bold text-done-text normal-case">più recente</span>}
                </p>
                <p className="text-sm text-muted-foreground">{formatSize(b.size)}</p>
              </div>
              <a
                href={`/admin/backup/scarica?file=${encodeURIComponent(b.name)}`}
                className="flex min-h-11 items-center gap-2 rounded-xl border-2 px-4 font-semibold"
              >
                <Download className="size-5" aria-hidden /> Scarica
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
