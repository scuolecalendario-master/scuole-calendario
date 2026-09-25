// Catalogo dei focus della lezione per livello.
// DEVE coincidere con public.focus_catalog() (migrazione 20260925020000_lesson_focus.sql):
// il database rifiuta codici non previsti per il livello della classe.

import type { Enums } from "@/types/database";

export type SchoolLevel = Enums<"school_level">;

export type Focus = {
  id: string;
  label: string;
  /** Breve spiegazione mostrata sotto la voce. */
  description?: string;
  /** Richiede un testo libero (es. "Gioco con…"). */
  withNote?: boolean;
};

export const LEVELS: { id: SchoolLevel; label: string }[] = [
  { id: "asilo", label: "Asilo" },
  { id: "elementari", label: "Elementari" },
  { id: "medie", label: "Medie" },
  { id: "superiori", label: "Superiori" },
];

export const LEVEL_LABEL = Object.fromEntries(LEVELS.map((l) => [l.id, l.label])) as Record<
  SchoolLevel,
  string
>;

const KINDERGARTEN: Focus[] = [
  { id: "acquaticita", label: "Acquaticità" },
  { id: "gioco_con", label: "Gioco con…", withNote: true },
  { id: "galleggiamenti_statici", label: "Galleggiamenti statici" },
  { id: "galleggiamenti_dinamici", label: "Galleggiamenti dinamici" },
  { id: "togliamo_supporto", label: "Togliamo il supporto" },
  { id: "viso_bolle", label: "Viso in acqua e bolle" },
  { id: "propulsione_gambe", label: "Spostamento con propulsione degli arti inferiori" },
  { id: "uso_braccia", label: "Cominciamo a utilizzare le braccia" },
  { id: "stile_basilare", label: "Stile basilare" },
  { id: "dorso_basilare", label: "Dorso basilare" },
];

const SCHOOL: Focus[] = [
  { id: "galleggiamenti_statici_dinamici", label: "Galleggiamenti statici e dinamici" },
  { id: "spostamento_con_supporto", label: "Spostamento con supporto" },
  { id: "spostamento_senza_supporto", label: "Spostamento senza supporto" },
  { id: "tecnica_stile", label: "Tecnica stile" },
  { id: "tecnica_dorso", label: "Tecnica dorso" },
  { id: "tecnica_rana", label: "Tecnica rana" },
  { id: "tecnica_farfalla", label: "Tecnica farfalla" },
  {
    id: "quinto_stile",
    label: "Quinto stile",
    description: "Partenze, tuffi, capovolte, virate e immersioni",
  },
  { id: "pallanuoto", label: "Pallanuoto" },
];

export const MAX_FOCUS = 6;

export function focusCatalog(level: SchoolLevel): Focus[] {
  return level === "asilo" ? KINDERGARTEN : SCHOOL;
}

const ALL = new Map([...KINDERGARTEN, ...SCHOOL].map((f) => [f.id, f]));

/** Etichetta leggibile, con il testo libero per "Gioco con…". */
export function focusLabel(id: string, note?: string | null) {
  const f = ALL.get(id);
  if (!f) return id;
  if (f.withNote && note) return `Gioco con ${note}`;
  return f.label;
}

export function focusDescription(id: string) {
  return ALL.get(id)?.description;
}

/** Filtra e valida i focus inviati dal client per il livello della classe. */
export function sanitizeFocus(level: SchoolLevel, focus: unknown): string[] {
  if (!Array.isArray(focus)) return [];
  const allowed = new Set(focusCatalog(level).map((f) => f.id));
  return [...new Set(focus.filter((f): f is string => typeof f === "string" && allowed.has(f)))].slice(
    0,
    MAX_FOCUS,
  );
}
