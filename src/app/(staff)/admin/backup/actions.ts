"use server";

import { revalidatePath } from "next/cache";

import { requireRole } from "@/lib/auth";
import { createBackup } from "@/lib/backup";

export async function backupNow(): Promise<{ error?: string; success?: string }> {
  await requireRole("master");
  try {
    const { counts } = await createBackup();
    revalidatePath("/admin/backup");
    return { success: `Backup creato: ${counts.lessons} lezioni, ${counts.classes} classi, ${counts.schools} istituti.` };
  } catch {
    return { error: "Backup non riuscito: controlla che la chiave segreta sia configurata." };
  }
}
