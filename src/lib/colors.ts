// Colori usati dal codice TS: devono coincidere con DESIGN.md e globals.css.

/** Palette per classi e istituti: tutti ≥ 4,5:1 con testo bianco (DESIGN.md §3). */
const PALETTE = [
  "#0052CC", "#087F3A", "#C2410C", "#7A2FE0", "#D42A1E",
  "#0B7285", "#C0156A", "#4A7A0C", "#3445D4", "#A15C00",
] as const;

/** Colore stabile dato un id: non cambia quando si aggiungono o tolgono elementi. */
function stableColor(id: string) {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export const schoolColor = stableColor;
export const classColor = stableColor;

/**
 * Classi Tailwind per livello (statiche, così Tailwind le genera).
 * `solid`: sfondo pieno con testo bianco; `checked`: stile di un chip selezionato.
 */
export const LEVEL_STYLE = {
  asilo: {
    solid: "bg-level-asilo text-white",
    checked: "has-checked:border-level-asilo has-checked:bg-level-asilo has-checked:text-white",
  },
  elementari: {
    solid: "bg-level-elementari text-white",
    checked: "has-checked:border-level-elementari has-checked:bg-level-elementari has-checked:text-white",
  },
  medie: {
    solid: "bg-level-medie text-white",
    checked: "has-checked:border-level-medie has-checked:bg-level-medie has-checked:text-white",
  },
  superiori: {
    solid: "bg-level-superiori text-white",
    checked: "has-checked:border-level-superiori has-checked:bg-level-superiori has-checked:text-white",
  },
} as const;
