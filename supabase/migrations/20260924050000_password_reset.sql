-- =============================================================================
-- Reset password gestito dal master: dopo una password temporanea l'utente
-- deve sceglierne una nuova al primo accesso.
-- Il flag viene impostato e azzerato solo dal server (chiave segreta):
-- gli utenti non hanno privilegi di update su questa colonna.
-- =============================================================================

alter table public.profiles
  add column must_change_password boolean not null default false;
