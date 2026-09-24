-- I visitatori anonimi (accesso con codice scuola) sono in sola lettura.
-- Senza privilegi di scrittura la richiesta viene rifiutata subito, prima che
-- i trigger (es. lessons_set_school_id) possano rivelare informazioni.
revoke insert, update, delete, truncate
  on public.schools, public.classes, public.lessons, public.profiles
  from anon;
