// Colori usati dal codice TS: devono coincidere con DESIGN.md e globals.css.

/** Palette per classi e istituti: tutti ≥ 4,5:1 con testo bianco (DESIGN.md §3). */
export const PALETTE = [
  "#0052CC", "#087F3A", "#C2410C", "#7A2FE0", "#D42A1E",
  "#0B7285", "#C0156A", "#4A7A0C", "#3445D4", "#A15C00",
] as const;

/** Colore stabile dato un id: non cambia quando si aggiungono o tolgono elementi. */
export function stableColor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export const schoolColor = stableColor;
export const classColor = stableColor;
