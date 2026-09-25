import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "backups";
const KEEP_DAYS = 60;
const PAGE = 1000;

// Tabelle applicative esportate (profiles senza dati di autenticazione).
// `keys`: ordinamento stabile per la paginazione (le insert in blocco condividono created_at).
const TABLES = [
  { name: "schools", columns: "*", keys: ["id"] },
  { name: "sites", columns: "*", keys: ["id"] },
  { name: "classes", columns: "*", keys: ["id"] },
  { name: "class_instructors", columns: "*", keys: ["class_id", "profile_id"] },
  { name: "lessons", columns: "*", keys: ["id"] },
  { name: "profiles", columns: "id, email, full_name, role, created_at", keys: ["id"] },
  { name: "registration_codes", columns: "*", keys: ["id"] },
  { name: "change_requests", columns: "*", keys: ["id"] },
] as const;

type Admin = ReturnType<typeof createAdminClient>;

async function exportTable(admin: Admin, table: (typeof TABLES)[number]) {
  const rows: unknown[] = [];
  for (let from = 0; ; from += PAGE) {
    let query = admin.from(table.name).select(table.columns);
    for (const key of table.keys) query = query.order(key);
    const { data, error } = await query.range(from, from + PAGE - 1);
    if (error) throw new Error(`${table.name}: ${error.message}`);
    rows.push(...data);
    if (data.length < PAGE) return rows;
  }
}

/** Crea un backup completo in JSON nel bucket privato e pulisce i vecchi. */
export async function createBackup() {
  const admin = createAdminClient();
  const createdAt = new Date().toISOString();
  const data: Record<string, unknown[]> = {};
  for (const t of TABLES) data[t.name] = await exportTable(admin, t);

  const name = `backup-${createdAt.slice(0, 16).replace(":", "")}.json`;
  const body = JSON.stringify({ version: 1, createdAt, tables: data });
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(name, new Blob([body], { type: "application/json" }), { upsert: true, contentType: "application/json" });
  if (error) throw new Error(`upload: ${error.message}`);

  await deleteOldBackups(admin);
  return { name, bytes: body.length, counts: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, v.length])) };
}

async function deleteOldBackups(admin: Admin) {
  const limit = Date.now() - KEEP_DAYS * 86_400_000;
  const { data: files } = await admin.storage.from(BUCKET).list("", { limit: 1000 });
  const old = (files ?? []).filter((f) => f.created_at && Date.parse(f.created_at) < limit).map((f) => f.name);
  if (old.length) await admin.storage.from(BUCKET).remove(old);
}

export async function listBackups() {
  const { data } = await createAdminClient()
    .storage.from(BUCKET)
    .list("", { limit: 100, sortBy: { column: "created_at", order: "desc" } });
  return (data ?? [])
    .filter((f) => f.name.endsWith(".json"))
    .map((f) => ({ name: f.name, createdAt: f.created_at, size: (f.metadata?.size as number | undefined) ?? null }));
}

/** URL firmato (60 s) per scaricare un backup. */
export async function backupDownloadUrl(name: string) {
  if (!/^backup-[\dT-]+\.json$/.test(name)) return null;
  const { data } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(name, 60, { download: name });
  return data?.signedUrl ?? null;
}
