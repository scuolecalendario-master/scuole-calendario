# DESIGN.md — Calendario lezioni di nuoto

> **Leggere questo file prima di qualsiasi modifica all'interfaccia.**
> Parola chiave: **semplicità**. Chi apre l'app deve trovare subito ciò che gli serve.

---

## 1. Principi

1. **Una cosa importante per schermata.** L'informazione chiave (es. *prossima lezione*) è la più grande e la prima in alto.
2. **Massimo 2 tocchi** per arrivare a ciò che serve (maestra → sua classe; istruttore → registrare la lezione).
3. **Colori accesi ad alto contrasto.** Il colore serve a riconoscere al volo (classe, stato, livello), mai a decorare.
4. **Pensato per lo smartphone.** Si progetta prima a 390 px di larghezza, poi si allarga.
5. **Pochi testi, brevi, in italiano semplice.** Niente gergo tecnico, niente frasi di riempimento.
6. **Target di tocco ≥ 44 px** (pulsanti, chip, voci di menu). Gli input principali sono alti 44 px (`h-11`), testo `text-base` (16 px, evita lo zoom su iPhone).

## 2. Chi usa cosa

| Utente | Dove | Cosa deve vedere subito |
|---|---|---|
| **Maestra** (nessun account) | `/scuola/[codice]` | la **sua classe** → **quando è la prossima lezione** → calendario completo della classe |
| **Istruttore** (smartphone, a bordo vasca) | `/istruttore/oggi` | lezioni di oggi e da registrare → **Svolta**, **presenti**, **focus** |
| **Master** | `/admin` | cose da fare: richieste, lezioni da registrare, lezioni di oggi |

## 3. Colori

Tutte le coppie testo/sfondo rispettano **WCAG AA (≥ 4,5:1)**. I valori sono verificati, non vanno “ritoccati a occhio”:
se si cambia un colore, si ricontrolla il contrasto.

### Base
| Token CSS | Valore | Uso |
|---|---|---|
| `--background` | `#F3F8FF` | sfondo pagina (azzurro chiarissimo) |
| `--card` | `#FFFFFF` | card, dialog, input |
| `--foreground` | `#0B1B33` | testo principale (inchiostro blu notte) — 16:1 sullo sfondo |
| `--muted-foreground` | `#44546A` | testo secondario — 7,2:1. **Mai grigi più chiari.** |
| `--border` | `#C9D6EA` | bordi |
| `--primary` | `#0052CC` | blu piscina: azioni principali, link, header — testo bianco 6,8:1 |

### Accenti (solo come **sfondo** con testo scuro `--foreground`)
| Nome | Valore | Contrasto con testo scuro |
|---|---|---|
| Turchese | `#00B3C7` | 6,8:1 |
| Giallo sole | `#FFC700` | 11:1 |
| Corallo | `#FF5A4E` | 5,6:1 |

⚠️ Mai testo bianco su turchese, giallo o corallo (contrasto insufficiente).

### Stati della lezione
| Stato | Pieno (testo bianco) | Tenue (sfondo / testo) | Icona |
|---|---|---|---|
| Svolta | `#087F3A` (5,1:1) | `#E3F6EA` / `#077A37` | ✓ |
| Annullata | `#D42A1E` (5,1:1) | `#FDE7E5` / `#B3231A` | ✕ |
| Programmata | `#0052CC` (6,8:1) | `#E3EDFF` / `#0052CC` | orologio |

Lo stato non si comunica **solo** col colore: c'è sempre anche l'icona o la parola.

### Livelli della classe
| Livello | Colore (testo bianco) |
|---|---|
| Asilo | `#C0156A` magenta |
| Elementari | `#087F3A` verde |
| Medie | `#0052CC` blu |
| Superiori | `#7A2FE0` viola |

### Colori di classi e istituti
Palette di 10 colori, tutti ≥ 4,5:1 con testo bianco, assegnati con un **hash stabile dell'id**
(`src/lib/colors.ts`): una classe ha sempre lo stesso colore, anche se se ne aggiungono altre.

`#0052CC` `#087F3A` `#C2410C` `#7A2FE0` `#D42A1E` `#0B7285` `#C0156A` `#4A7A0C` `#3445D4` `#A15C00`

## 4. Tipografia

Font: **Geist** (già caricato in `src/app/layout.tsx`).

| Ruolo | Classe Tailwind | Esempio |
|---|---|---|
| Dato chiave (data prossima lezione, orario) | `text-3xl`–`text-4xl font-bold tabular-nums` | **Martedì 29 settembre** |
| Titolo pagina | `text-2xl font-bold` | Scuola Manzoni |
| Titolo card / sezione | `text-lg font-semibold` | Plesso Rodari |
| Testo | `text-base` | |
| Secondario | `text-sm text-muted-foreground` | 22 iscritti |

Numeri (orari, presenti, date) sempre con `tabular-nums`.

## 5. Spazi e forme

- Raggio: `--radius: 0.875rem` (card `rounded-2xl`, pulsanti/input `rounded-xl`, chip `rounded-full`).
- Spazio tra card: `gap-3` su smartphone, `gap-4` da tablet. Margini pagina `px-4` (smartphone) / `px-6`.
- Ombre leggere (`shadow-sm`) solo su card cliccabili; niente ombre decorative.

## 6. Componenti

| Componente | Regole |
|---|---|
| **Card classe** (portale) | sfondo pieno del colore della classe, testo bianco; nome classe `text-2xl font-bold`; sotto “Prossima: mar 29/9 · 9:00”. Tutta la card è cliccabile. |
| **Prossima lezione** | riquadro grande in cima: giorno + data `text-3xl`, orario `text-2xl`, “tra 4 giorni”. Bordo/sfondo del colore della classe. Se non ci sono lezioni: “Nessuna lezione in programma”. |
| **Badge di stato** | pieno per lo stato corrente in evidenza, tenue negli elenchi; sempre icona + parola. |
| **Chip focus** | `rounded-full`, altezza ≥ 44 px quando selezionabili (istruttore), compatti in sola lettura (maestre). Selezionato = pieno colore livello + ✓. |
| **Pulsante primario** | `--primary` pieno, testo bianco, una sola azione primaria per schermata. |
| **Header staff** | barra `--primary` con testo bianco; voce attiva sottolineata/evidenziata; badge rossi numerici (richieste, da registrare). |
| **Dialog** | titolo breve, azione primaria a destra, “Annulla” sempre presente. |
| **Banner “Installa”** | `InstallBanner`: una riga breve + pulsante primario “Installa” + ✕. Android: prompt nativo; iPhone: 3 passaggi illustrati. Mai sopra l'informazione chiave (nel portale va sotto “Prossima lezione”); nascosto se l'app è già installata o chiuso con ✕. |
| **Messaggi** | errore in `#B3231A` con `role="alert"`; conferma breve (“Salvato”). |

## 7. Pattern

- **Liste di lezioni**: raggruppate per giorno o per mese; oggi evidenziato; passato attenuato (non nascosto).
- **Date**: “Martedì 29 settembre” (maestre), “mar 29/9” negli spazi stretti. Fuso orario sempre `Europe/Rome` (`src/lib/dates.ts`).
- **Scelte rapide**: toggle/chip grandi invece di menu a tendina quando le opzioni sono ≤ 10 e servono tocchi veloci.
- **Moduli**: dopo un errore i campi mantengono i valori (vedi `values`/`key` nelle action); le password no.
- **Stampa**: pagine `…/stampa` in bianco e nero leggibile, tabella semplice, niente header/menu.

## 8. Da fare / da evitare

| ✅ Fare | ❌ Evitare |
|---|---|
| Prima l'informazione, poi i dettagli | Pagine con tanti riquadri tutti uguali |
| Colore + icona + parola per lo stato | Solo colore (non leggibile da tutti) |
| Testo bianco su colori pieni della palette | Testo bianco su turchese, giallo, corallo |
| `text-muted-foreground` (#44546A) per il secondario | Grigi chiari (`text-gray-400` & co.) |
| Un'azione primaria per schermata | Più pulsanti blu uno accanto all'altro |
| Etichette brevi: “Svolta”, “Presenti” | Frasi lunghe nei pulsanti |

## 9. Dove vivono i token

- `src/app/globals.css` — variabili CSS (`:root`) e tema FullCalendar (`.lesson-calendar`).
- `src/lib/colors.ts` — palette classi/istituti, colori livelli e stati per il codice TS.
- `src/components/lessons/status-badge.tsx` — badge di stato.
