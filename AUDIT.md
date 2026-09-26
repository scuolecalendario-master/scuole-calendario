# AUDIT.md — Controllo completo del codice (26 settembre 2026)

Rapporto in tre parti: **1. Errori (bug)** · **2. Codice inutilizzato** · **3. Colli di bottiglia**.
**Non è stato corretto nulla**: questo elenco serve per decidere insieme cosa sistemare.

La checklist di partenza era pensata per un'app Flutter con i "club". Qui l'ho adattata a questa app
(Next.js + Supabase): al posto dei club ci sono gli **istituti**. L'app non lavora offline, quindi
invece della sincronizzazione ho controllato cosa succede quando **due persone modificano la stessa cosa**.

**Gravità**
- 🔴 **Bloccante**: da sistemare subito, perché si perdono dati o ne vede chi non dovrebbe.
- 🟠 **Da sistemare presto**: un problema reale, ma raro o con danni limitati.
- 🟡 **Rifinitura**: miglioria, pulizia o prudenza in più.

> **In sintesi:** nessun problema bloccante. L'isolamento tra istituti regge: una maestra vede solo il
> suo istituto e un istruttore solo gli istituti assegnati (verificato con prove reali sul database).
> Ci sono 6 punti da sistemare presto e diverse rifiniture.

## Stato delle correzioni (26 settembre 2026)

| Punti | Stato |
|---|---|
| 1.7, 1.9, 1.10, 1.11, 1.12, 1.13, 1.14, 1.15, 1.5 | ✅ corretti nel codice e provati nel browser |
| 1.8 | ✅ il corso salta le date già presenti (doppio clic provato) e il database rifiuta i doppioni (`lessons_no_duplicates`, migrazione `20260926020000_audit_fixes.sql`) |
| 1.1, 1.2 | ✅ stessa migrazione, applicata: l'istruttore vede solo i colleghi delle sue classi; massimo 10 richieste al giorno per istituto |
| 2.1–2.6, 3.1 | ✅ corretti: seed aggiornato e provato, `badge.tsx` e `@fullcalendar/core` tolti, funzioni inutili tolte o rese private, README nuovo, sorgenti del logo in `design/`, icone da 249 a 60 KB |
| 1.3 | ➖ lasciato così: le regole per riga bloccano già tutto e il database via web non permette di "svuotare" tabelle |
| 1.4 | ➖ lasciato così: gli istruttori si registrano da soli con il codice; senza codice l'account non vede nulla |
| 1.6, 3.2, 3.3 | ➖ nessuna modifica necessaria (vedi le note nelle tabelle) |

---

## 1. Errori (bug)

### Isolamento tra istituti (RLS): priorità alta

Ho verificato:
- tutte le tabelle hanno la protezione per riga (RLS) attiva;
- con il codice di un istituto non si leggono classi o lezioni di un altro;
- un istruttore legge solo gli istituti delle classi assegnate;
- le maestre non leggono né le note delle lezioni né le richieste;
- ogni azione del pannello controlla il ruolo;
- il bucket dei backup è privato.

Gli unici punti deboli trovati:

| # | Gravità | Dove | Cosa significa in pratica |
|---|---|---|---|
| 1.1 | 🟠 Presto | `supabase/migrations/20260924010000_swim_data_model.sql:295` (regola "profiles: lettura staff") | Un istruttore, con un minimo di abilità tecnica, può vedere **nomi ed email di tutti gli altri istruttori e del master**, anche di istituti non suoi. Le lezioni restano protette; il problema riguarda solo i contatti. |
| 1.2 | 🟠 Presto | `supabase/migrations/20260925030000_requests_push_backups.sql:71` | Il limite contro lo spam è di **3 richieste aperte per lezione**, non per istituto. Chi ha il codice di un istituto può inviare molte richieste, una per ogni lezione futura, e **far squillare il tuo telefono decine di volte**. |
| 1.3 | 🟡 Rifinitura | permessi del database (migrazioni `…init_schema.sql`, `…revoke_anon_writes.sql`) | Il ruolo "utente registrato" ha permessi larghi a livello di tabella (anche "svuota tabella") e i visitatori possono chiamare tutte le funzioni. **Oggi le regole per riga bloccano tutto**, quindi nessun dato è esposto; stringerli è solo una seconda cintura di sicurezza. |
| 1.4 | 🟡 Rifinitura | `supabase/config.toml:220-225` + registrazione istruttori | Chiunque può creare un account senza conferma email. **Senza codice di registrazione quell'account non vede nulla**, ma nel sistema restano account vuoti. |
| 1.5 | 🟡 Rifinitura | `src/app/(staff)/admin/report/export/route.ts:12`, `src/app/(staff)/admin/backup/scarica/route.ts:8` | Chi deve ancora cambiare la password temporanea può comunque scaricare il report o il backup con il link diretto. Il rischio è minimo: servono comunque le credenziali del master. |
| 1.6 | 🟡 Rifinitura | `supabase/migrations/20260924010000_swim_data_model.sql:39` (codice istituto) | Il codice dell'istituto è il nome più una parte casuale di 8 caratteri. È difficile da indovinare, ma **chi riceve il link lo può inoltrare**. Se succede, c'è già "Rigenera codice". |

### Dati e modifiche contemporanee

| # | Gravità | Dove | Cosa significa in pratica |
|---|---|---|---|
| 1.7 | 🟠 Presto | `src/app/(staff)/admin/calendario/actions.ts:119` | Se il master tiene aperta una lezione nel calendario mentre l'istruttore la registra a bordo vasca, quando il master preme "Salva" **cancella "Svolta", i presenti e i focus appena inseriti dall'istruttore**. |
| 1.8 | 🟠 Presto | `src/app/(staff)/admin/calendario/actions.ts:166-193` (`createCourse`) + tabella `lessons` senza vincolo di unicità | Se si preme due volte "Crea corso", o si ripete lo stesso corso, **le lezioni vengono create doppie** e compaiono due volte a maestre e istruttori. |
| 1.9 | 🟠 Presto | `src/app/(public)/scuola/[code]/classe/[classId]/page.tsx:43` e `…/stampa/page.tsx:28` | La pagina della classe mostra solo l'anno scolastico in corso, da settembre ad agosto. **A luglio o agosto una maestra non vede le lezioni già programmate per settembre**: legge "Nessuna lezione in programma". |

### Errori del database non gestiti

| # | Gravità | Dove | Cosa significa in pratica |
|---|---|---|---|
| 1.10 | 🟠 Presto | `src/lib/portal.ts:15` | Se il database ha un problema momentaneo, la maestra vede **"Codice non valido"** invece di "Riprova tra poco": penserà che il link sia sbagliato. |
| 1.11 | 🟠 Presto | Portale: `scuola/[code]/page.tsx:20`, `classe/[classId]/page.tsx:36`, `stampa/page.tsx:21`, `scuola/[code]/actions.ts:35` · Istruttore: `istruttore/oggi/page.tsx:23`, `istruttore/oggi/actions.ts:30` | In caso di errore del database queste pagine mostrano **elenchi vuoti** ("Nessuna lezione") invece di un messaggio di errore. Chi le guarda può credere che le lezioni siano sparite. |
| 1.12 | 🟡 Rifinitura | Pannello master: `admin/page.tsx:14`, `istruttori/page.tsx:31`, `scuole/page.tsx:18`, `scuole/[id]/page.tsx:29`, `programma/page.tsx:10`, `richieste/page.tsx:20`, `lib/calendar-data.ts:10`, `lib/admin-stats.ts:32,48`, `lib/report.ts:106`, `lib/auth.ts:18`, `login/actions.ts:20` | Stesso problema lato master: un errore appare come "nessun dato" o come contatore a zero. È meno grave, perché il master ricarica e capisce. |

### Piccoli difetti

| # | Gravità | Dove | Cosa significa in pratica |
|---|---|---|---|
| 1.13 | 🟡 Rifinitura | `src/app/(staff)/admin/programma/course-form.tsx:54` | Da giugno ad agosto il campo "Al" del nuovo corso propone il **31 maggio già passato**: bisogna correggerlo a mano. |
| 1.14 | 🟡 Rifinitura | `src/components/calendar/lesson-calendar.tsx:313` (`hiddenDays={[0]}`) | La domenica è nascosta nel calendario. Una lezione messa di domenica per errore **non si vede e non si può correggere** dal calendario. |
| 1.15 | 🟡 Rifinitura | `src/components/copy-button.tsx:29` | Il timer che rimette "Copia" dopo 2 secondi non viene fermato se si cambia pagina. Non si rompe nulla: al massimo compare un avviso tecnico nella console. |

Nota: i controlli automatici (TypeScript ed ESLint) **non segnalano nessun errore**.

---

## 2. Codice inutilizzato

| # | Gravità | Dove | Cosa significa in pratica |
|---|---|---|---|
| 2.1 | 🟡 Rifinitura | `supabase/seed.sql` | I dati di prova per lo sviluppo locale sono vecchi: mancano plessi, livelli, focus e istruttori delle classi. Chi prova l'app in locale vede un'app "vuota" o incompleta. |
| 2.2 | 🟡 Rifinitura | `src/components/ui/badge.tsx` | Componente mai usato (i badge di stato usano `status-badge.tsx`). Si può cancellare. |
| 2.3 | 🟡 Rifinitura | `package.json` → `@fullcalendar/core` | Libreria dichiarata ma già inclusa in `@fullcalendar/react`. Si può togliere dall'elenco. Al contrario, `postcss` è usato ma non dichiarato. |
| 2.4 | 🟡 Rifinitura | Funzioni esportate mai usate: `lib/dates.ts` (`startOfWeek`, `formatShort`, `daysBetween`), `lib/focus.ts` (`focusDescription`), `lessons/status-badge.tsx` (`STATUS_ICON`), `components/brand.tsx` (`APP_NAME`, `Wordmark`), `install/install-state.ts` (`isStandalone`), `remember-class` (`LAST_SCHOOL_KEY`), `lib/colors.ts` (`PALETTE`, `stableColor`: usate solo all'interno del file) | Codice rimasto da versioni precedenti: si può togliere o rendere privato. Non pesa sull'app. Le esportazioni dei componenti shadcn (`ui/`) conviene lasciarle. |
| 2.5 | 🟡 Rifinitura | `README.md` | È ancora il testo predefinito di Next.js: non spiega cosa fa l'app né come avviarla. |
| 2.6 | 🟡 Rifinitura | `AquaClass_Connect_logo.svg`, `logo_app_svg.md` (nella cartella principale, non salvati su git) | File sorgente del logo. Vanno spostati in una cartella (es. `design/`) e salvati, oppure cancellati: il logo usato dall'app è già in `public/brand/`. |

Nota: `public/sw.js` risulta "non usato" agli strumenti automatici, ma **serve** per le notifiche push. Non va toccato.

---

## 3. Colli di bottiglia (velocità)

| # | Gravità | Dove | Cosa significa in pratica |
|---|---|---|---|
| 3.1 | 🟡 Rifinitura | `public/icons/icon-512.png` (249 KB), `icon-maskable-512.png` (156 KB) | Le icone grandi dell'app pesano più del necessario. Si scaricano **una volta sola**, all'installazione; comprimendole si arriva a circa 30–50 KB. |
| 3.2 | 🟡 Rifinitura | `src/lib/supabase/proxy.ts:37` | A ogni pagina il server controlla l'accesso, anche sulle pagine pubbliche delle maestre che non ne hanno bisogno. Il controllo è rapido (pochi millesimi di secondo), ma si potrebbe saltare dove non serve. |
| 3.3 | 🟡 Rifinitura | `src/components/calendar/lesson-calendar.tsx` (pezzo JavaScript da ~550 KB) | Il calendario è la parte più pesante dell'app. **Viene però caricato solo nella pagina Calendario del master** (maestre e istruttori non lo scaricano), quindi va bene così. |

Cose già a posto:
- **elenchi con limiti**: le liste lunghe (lezioni nel calendario, esportazione report) sono caricate a blocchi o per periodo;
- **letture in parallelo**: le pagine fanno le letture al database insieme, non una dopo l'altra;
- **immagini ottimizzate**: il logo è in WebP (8–32 KB);
- **nessun ricaricamento inutile** dei componenti.

---

## Proposta di ordine per le correzioni

1. **Subito, perché si possono perdere dati**:
   - 1.7: il salvataggio del master non deve cancellare la registrazione dell'istruttore;
   - 1.8: niente lezioni doppie.
2. **Poi l'esperienza delle maestre**:
   - 1.9: le lezioni di settembre devono vedersi anche d'estate;
   - 1.10 e 1.11: messaggio "Riprova" invece di "Codice non valido" o elenchi vuoti.
3. **Poi privacy e notifiche**:
   - 1.1: gli istruttori non devono vedere le email degli altri;
   - 1.2: limite di richieste per istituto.
4. **Infine le rifiniture** (sezione 1 in 🟡, sezioni 2 e 3), tutte insieme in un solo intervento.
