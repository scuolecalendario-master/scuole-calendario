"use client";

import { DatabaseBackup } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { backupNow } from "./actions";

export function BackupNowButton() {
  const [result, setResult] = useState<{ error?: string; success?: string }>({});
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-2">
      <Button
        onClick={() => startTransition(async () => setResult(await backupNow()))}
        disabled={pending}
        className="h-12 self-start px-5 text-base"
      >
        <DatabaseBackup className="size-5" aria-hidden />
        {pending ? "Backup in corso…" : "Crea backup ora"}
      </Button>
      {result.success && <p className="font-medium text-done-text" role="status">{result.success}</p>}
      {result.error && <p className="font-medium text-cancelled-text" role="alert">{result.error}</p>}
    </div>
  );
}
