# AquaClass Connect

Calendario delle lezioni di nuoto per le scuole. Online su https://scuole-calendario.vercel.app

| Chi | Dove | Cosa fa |
|---|---|---|
| **Maestre** (senza account) | `/scuola/[codice]` | vedono la prossima lezione e il calendario della classe, stampano, chiedono spostamenti |
| **Istruttori** | `/istruttore/oggi` | registrano le lezioni: svolta, presenti, focus |
| **Master** | `/admin` | istituti, classi, corsi, calendario, richieste, report, backup |

Tecnologie: Next.js (App Router), TypeScript, Tailwind + shadcn, Supabase (database, login, RLS),
Vercel (hosting e cron dei backup), notifiche web push. Tutto su piani gratuiti.

## Avvio in locale

```bash
npm install
cp .env.example .env.local   # compila con le chiavi del progetto Supabase
npm run dev                  # http://localhost:3000
```

## Database

- Le modifiche al database stanno in `supabase/migrations/` (un file per modifica).
- `npx supabase db push --dry-run` mostra cosa verrebbe applicato; `npx supabase db push` lo applica.
- Dopo una migrazione: `npm run db:types` rigenera `src/types/database.ts`.
- `supabase/seed.sql`: dati di prova per un database locale (due istituti `…-demo000x`).

La sicurezza è nel database: ogni tabella ha regole per riga (RLS). Le maestre leggono solo
l'istituto del proprio codice, gli istruttori solo gli istituti delle classi assegnate.

## Regole del progetto

- **Interfaccia**: prima di modificarla leggere [`DESIGN.md`](DESIGN.md).
- **Controllo del codice**: [`AUDIT.md`](AUDIT.md).
- Prima di un commit: `npx tsc --noEmit`, `npm run lint`, `npm run build`.
