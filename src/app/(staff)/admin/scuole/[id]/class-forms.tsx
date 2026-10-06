"use client";

import { Check, ChevronDown } from "lucide-react";

import { ConfirmAction } from "@/components/confirm-action";
import { CopyButton, useOrigin } from "@/components/copy-button";
import { FormMessage } from "@/components/form-message";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { LEVEL_STYLE } from "@/lib/colors";
import { LEVEL_LABEL, LEVELS, type SchoolLevel } from "@/lib/focus";
import { cn } from "@/lib/utils";
import type { ActionState } from "@/lib/forms";
import { useFormAction } from "@/lib/use-form-action";

type FormAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

export type ClassData = {
  id: string;
  grade_name: string;
  total_enrolled: number;
  level: SchoolLevel;
  site_id: string | null;
  instructorIds: string[];
  lessonsCount: number;
};

type Options = {
  sites: { id: string; name: string }[];
  instructors: { id: string; name: string }[];
};

/** Campi comuni a "nuova classe" e "modifica classe". */
function ClassFields({ data, sites, instructors, idPrefix }: Options & { data?: ClassData; idPrefix: string }) {
  // key sui campi: dopo un salvataggio ripartono dai valori aggiornati (DESIGN.md §7)
  const k = data ? `${data.grade_name}-${data.level}-${data.site_id}-${data.total_enrolled}` : "new";
  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[2fr_1.3fr_1.6fr_1fr]">
        <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <Label htmlFor={`${idPrefix}-name`}>Classe</Label>
          <Input
            key={`n-${k}`}
            id={`${idPrefix}-name`}
            name="grade_name"
            defaultValue={data?.grade_name}
            placeholder="Es. 3A"
            maxLength={40}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-level`}>Livello</Label>
          <NativeSelect
            key={`l-${k}`}
            id={`${idPrefix}-level`}
            name="level"
            defaultValue={data?.level ?? ""}
            required
          >
            <option value="" disabled>
              Scegli…
            </option>
            {LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.label}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`${idPrefix}-site`}>Plesso</Label>
          <NativeSelect key={`s-${k}`} id={`${idPrefix}-site`} name="site_id" defaultValue={data?.site_id ?? ""}>
            <option value="">Nessun plesso</option>
            {sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="col-span-2 flex flex-col gap-1 sm:col-span-1">
          <Label htmlFor={`${idPrefix}-enrolled`}>Iscritti</Label>
          <Input
            key={`e-${k}`}
            id={`${idPrefix}-enrolled`}
            name="total_enrolled"
            type="number"
            inputMode="numeric"
            min={0}
            max={200}
            defaultValue={data?.total_enrolled ?? 0}
            required
          />
        </div>
      </div>

      {instructors.length > 0 && (
        <fieldset className="flex flex-col gap-1">
          <legend className="mb-1 text-sm font-medium">Istruttori</legend>
          <div className="flex flex-wrap gap-2">
            {instructors.map((i) => (
              <label
                key={`${i.id}-${k}-${data?.instructorIds.join()}`}
                className="group relative flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-2 border-border bg-card px-4 text-sm font-medium has-checked:border-primary has-checked:bg-primary has-checked:text-primary-foreground"
              >
                <input
                  type="checkbox"
                  name="instructors"
                  value={i.id}
                  defaultChecked={data?.instructorIds.includes(i.id)}
                  className="sr-only"
                />
                <Check className="hidden size-4 group-has-checked:block" aria-hidden />
                {i.name}
              </label>
            ))}
          </div>
        </fieldset>
      )}
    </>
  );
}

/** Classe esistente: modifica, link diretto per le maestre, eliminazione. */
export function ClassRow({
  data,
  classPath,
  updateAction,
  deleteAction,
  ...options
}: Options & {
  data: ClassData;
  /** Percorso del portale della classe (link diretto per le maestre). */
  classPath: string;
  updateAction: FormAction;
  deleteAction: () => Promise<void>;
}) {
  const { state, pending, onSubmit } = useFormAction(updateAction);
  const origin = useOrigin();
  const names = data.instructorIds
    .map((id) => options.instructors.find((i) => i.id === id)?.name)
    .filter(Boolean) as string[];

  // Chiusa = una riga di riepilogo: con 30+ classi la pagina resta breve
  return (
    <li>
      <details className="group/row rounded-2xl border bg-card open:border-primary/50">
        <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-3 py-2 sm:px-4 [&::-webkit-details-marker]:hidden">
          <span className="text-lg font-bold">{data.grade_name}</span>
          <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", LEVEL_STYLE[data.level].solid)}>
            {LEVEL_LABEL[data.level]}
          </span>
          <span className="min-w-0 flex-1 text-sm leading-snug">
            <span className="tabular-nums">{data.total_enrolled} iscritti</span>
            <span className={cn("block truncate", names.length ? "text-muted-foreground" : "font-semibold text-cancelled-text")}>
              {names.length ? names.join(", ") : "Nessun istruttore"}
            </span>
          </span>
          <span className="hidden text-sm font-semibold text-primary sm:inline group-open/row:hidden">Modifica</span>
          <ChevronDown className="size-5 shrink-0 text-primary transition-transform group-open/row:rotate-180" aria-hidden />
        </summary>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 border-t p-3 sm:p-4">
          <ClassFields data={data} idPrefix={`c-${data.id}`} {...options} />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Salvataggio…" : "Salva"}
            </Button>
            <CopyButton text={`${origin}${classPath}`} label="Copia link classe" />
            <span className="ml-auto text-sm text-muted-foreground">{data.lessonsCount} lezioni</span>
            <ConfirmAction
              action={deleteAction}
              trigger="Elimina"
              title={`Eliminare la classe ${data.grade_name}?`}
              description={
                data.lessonsCount > 0
                  ? `Verranno eliminate anche le sue ${data.lessonsCount} lezioni, con presenze e focus registrati. L'operazione non è reversibile.`
                  : "La classe non ha lezioni. L'operazione non è reversibile."
              }
              confirmLabel="Elimina classe"
            />
          </div>
          <FormMessage state={state} />
        </form>
      </details>
    </li>
  );
}

export function NewClassForm({ action, ...options }: Options & { action: FormAction }) {
  const { state, pending, onSubmit } = useFormAction(action, { resetOnSuccess: true });

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-3 rounded-2xl border-2 border-dashed border-primary/40 p-3 sm:p-4"
    >
      <p className="font-semibold">Nuova classe</p>
      <ClassFields idPrefix="new" {...options} />
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Aggiungi classe"}
        </Button>
        <FormMessage state={state} />
      </div>
    </form>
  );
}
