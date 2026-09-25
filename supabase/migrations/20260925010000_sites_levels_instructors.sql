-- =============================================================================
-- Istituti → plessi → classi; livello della classe; istruttori della classe.
-- Nell'interfaccia "Istituto" = public.schools (ha il codice per le maestre).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Plessi
-- -----------------------------------------------------------------------------
create table public.sites (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools (id) on delete cascade,
  name        text not null check (char_length(trim(name)) between 1 and 120),
  created_at  timestamptz not null default now(),
  unique (school_id, name)
);
create index sites_school_id_idx on public.sites (school_id);

alter table public.sites enable row level security;

create policy "sites: lettura con codice"
  on public.sites for select to anon, authenticated
  using (school_id = (select public.request_school_id()));

create policy "sites: lettura staff"
  on public.sites for select to authenticated
  using ((select public.auth_role()) is not null);

create policy "sites: master gestisce"
  on public.sites for all to authenticated
  using ((select public.auth_role()) = 'master')
  with check ((select public.auth_role()) = 'master');

revoke all on public.sites from anon;
grant select (id, school_id, name) on public.sites to anon;

alter table public.classes
  add column site_id uuid references public.sites (id) on delete set null;
create index classes_site_id_idx on public.classes (site_id);

-- Il plesso deve appartenere allo stesso istituto della classe.
create or replace function public.classes_check_site()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.site_id is not null and not exists (
    select 1 from public.sites s where s.id = new.site_id and s.school_id = new.school_id
  ) then
    raise exception 'Il plesso non appartiene a questo istituto' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger classes_check_site
  before insert or update of site_id, school_id on public.classes
  for each row execute function public.classes_check_site();

-- -----------------------------------------------------------------------------
-- Livello della classe (determina i focus disponibili)
-- -----------------------------------------------------------------------------
create type public.school_level as enum ('asilo', 'elementari', 'medie', 'superiori');

-- Le classi esistenti partono da "elementari": l'interfaccia chiede di verificarle.
-- Il default resta finché la versione online precedente (senza livello) è attiva;
-- la nuova interfaccia invia sempre il livello.
alter table public.classes
  add column level public.school_level not null default 'elementari';

-- -----------------------------------------------------------------------------
-- Istruttori assegnati alla classe
-- -----------------------------------------------------------------------------
create table public.class_instructors (
  class_id    uuid not null references public.classes (id) on delete cascade,
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  primary key (class_id, profile_id)
);
create index class_instructors_profile_idx on public.class_instructors (profile_id);

alter table public.class_instructors enable row level security;

create policy "class_instructors: lettura staff"
  on public.class_instructors for select to authenticated
  using ((select public.auth_role()) is not null);

create policy "class_instructors: master gestisce"
  on public.class_instructors for all to authenticated
  using ((select public.auth_role()) = 'master')
  with check ((select public.auth_role()) = 'master');

revoke all on public.class_instructors from anon;

create or replace function public.is_class_instructor(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_instructors ci
    where ci.class_id = p_class_id and ci.profile_id = (select auth.uid())
  );
$$;

revoke all on function public.is_class_instructor(uuid) from public;
grant execute on function public.is_class_instructor(uuid) to authenticated;

-- Gli istruttori aggiornano solo le lezioni delle proprie classi
-- o quelle assegnate direttamente a loro (supplenza).
drop policy if exists "lessons: istruttore aggiorna" on public.lessons;
create policy "lessons: istruttore aggiorna"
  on public.lessons for update to authenticated
  using (
    (select public.auth_role()) = 'instructor'
    and (public.is_class_instructor(class_id) or instructor_id = (select auth.uid()))
  )
  with check (
    (select public.auth_role()) = 'instructor'
    and (public.is_class_instructor(class_id) or instructor_id = (select auth.uid()))
  );
