-- Correzioni dal controllo del codice (AUDIT.md: 1.1, 1.2, 1.8).

-- -----------------------------------------------------------------------------
-- 1.8 Niente lezioni doppie: una classe non può avere due lezioni attive
-- alla stessa data e ora (doppio clic su "Crea corso", corso ripetuto).
-- Le annullate restano fuori: al loro posto si può rimettere una lezione.
-- -----------------------------------------------------------------------------
create unique index if not exists lessons_no_duplicates
  on public.lessons (class_id, date, start_time)
  where status <> 'cancelled';

-- -----------------------------------------------------------------------------
-- 1.1 Profili: un istruttore vede il proprio e quelli dei colleghi che
-- condividono almeno una sua classe (nomi mostrati in "Oggi"), non tutti.
-- Il master continua a vedere tutto con "profiles: master gestisce".
-- -----------------------------------------------------------------------------
create or replace function public.shares_class_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.class_instructors mine
    join public.class_instructors other on other.class_id = mine.class_id
    where mine.profile_id = (select auth.uid())
      and other.profile_id = p_profile_id
  );
$$;

revoke all on function public.shares_class_with(uuid) from public, anon;
grant execute on function public.shares_class_with(uuid) to authenticated;

drop policy if exists "profiles: lettura staff" on public.profiles;
create policy "profiles: lettura colleghi"
  on public.profiles for select to authenticated
  using (public.shares_class_with(id));

-- -----------------------------------------------------------------------------
-- 1.2 Anti-spam: oltre a 3 richieste aperte per lezione, al massimo 10
-- richieste al giorno per istituto (ogni richiesta fa suonare il telefono).
-- -----------------------------------------------------------------------------
create or replace function public.change_requests_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.change_requests
      where lesson_id = new.lesson_id and handled_at is null) >= 3 then
    raise exception 'Ci sono già richieste in attesa per questa lezione'
      using errcode = '23514';
  end if;
  if (select count(*) from public.change_requests
      where school_id = new.school_id and created_at > now() - interval '24 hours') >= 10 then
    raise exception 'Troppe richieste oggi da questo istituto: riprova domani'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
