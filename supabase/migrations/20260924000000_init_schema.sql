-- =============================================================================
-- Scuole Calendario — schema Supabase
--
-- Modello di accesso:
--   * Accesso pubblico con codice scuola: il client invia l'header HTTP
--     `x-school-code`; le policy RLS lo leggono da `request.headers` e
--     restituiscono solo le righe della scuola a cui appartiene il codice.
--   * Personale autenticato (tabella profiles): legge i dati della propria
--     scuola; gli utenti con ruolo 'admin' possono anche modificarli.
--
-- Applicare con: npx supabase db push
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Tipi
-- -----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'user_role') then
    create type public.user_role as enum ('admin', 'teacher');
  end if;
end$$;

-- -----------------------------------------------------------------------------
-- Tabelle
-- -----------------------------------------------------------------------------
create table if not exists public.schools (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  -- Codice unico condiviso con studenti/famiglie: 16 caratteri esadecimali
  -- casuali (64 bit), difficile da indovinare.
  access_code  text not null unique
               default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16))
               check (char_length(access_code) >= 8),
  created_at   timestamptz not null default now()
);

create table if not exists public.classes (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references public.schools (id) on delete cascade,
  name         text not null,                 -- es. "3A"
  school_year  text,                          -- es. "2026/2027"
  created_at   timestamptz not null default now(),
  unique (school_id, name, school_year)
);

create table if not exists public.lessons (
  id           uuid primary key default gen_random_uuid(),
  -- school_id è denormalizzato per semplificare (e velocizzare) le policy RLS;
  -- il trigger sotto garantisce che coincida con quello della classe.
  school_id    uuid not null references public.schools (id) on delete cascade,
  class_id     uuid not null references public.classes (id) on delete cascade,
  subject      text not null,
  teacher      text,
  room         text,
  starts_at    timestamptz not null,
  ends_at      timestamptz not null,
  notes        text,
  created_at   timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  school_id    uuid references public.schools (id) on delete set null,
  full_name    text,
  role         public.user_role not null default 'teacher',
  created_at   timestamptz not null default now()
);

create index if not exists classes_school_id_idx   on public.classes (school_id);
create index if not exists lessons_school_time_idx on public.lessons (school_id, starts_at);
create index if not exists lessons_class_time_idx  on public.lessons (class_id, starts_at);
create index if not exists profiles_school_id_idx  on public.profiles (school_id);

-- -----------------------------------------------------------------------------
-- Trigger: lessons.school_id sempre coerente con classes.school_id
-- -----------------------------------------------------------------------------
create or replace function public.lessons_set_school_id()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select c.school_id into new.school_id
  from public.classes c
  where c.id = new.class_id;

  if new.school_id is null then
    raise exception 'Classe % inesistente', new.class_id;
  end if;
  return new;
end;
$$;

drop trigger if exists lessons_set_school_id on public.lessons;
create trigger lessons_set_school_id
  before insert or update of class_id, school_id on public.lessons
  for each row execute function public.lessons_set_school_id();

-- -----------------------------------------------------------------------------
-- Profilo automatico alla registrazione di un utente
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Funzioni helper per RLS
-- (security definer: leggono schools/profiles senza essere soggette a RLS,
--  evitando ricorsione nelle policy e senza esporre i codici delle altre scuole)
-- -----------------------------------------------------------------------------

-- Scuola identificata dall'header `x-school-code` della richiesta corrente.
create or replace function public.request_school_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select s.id
  from public.schools s
  where s.access_code = upper(trim(
    coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-school-code'
  ));
$$;

-- Scuola dell'utente autenticato.
create or replace function public.auth_school_id()
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select p.school_id from public.profiles p where p.id = (select auth.uid());
$$;

-- L'utente autenticato è admin della propria scuola?
create or replace function public.auth_is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'admin' from public.profiles p where p.id = (select auth.uid())),
    false
  );
$$;

revoke all on function public.request_school_id() from public;
revoke all on function public.auth_school_id()    from public;
revoke all on function public.auth_is_admin()     from public;
grant execute on function public.request_school_id() to anon, authenticated;
grant execute on function public.auth_school_id()    to authenticated;
grant execute on function public.auth_is_admin()     to authenticated;

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.schools  enable row level security;
alter table public.classes  enable row level security;
alter table public.lessons  enable row level security;
alter table public.profiles enable row level security;

-- ---------- schools ----------
drop policy if exists "schools: lettura con codice"        on public.schools;
drop policy if exists "schools: lettura propria scuola"    on public.schools;
drop policy if exists "schools: admin aggiorna"            on public.schools;

create policy "schools: lettura con codice"
  on public.schools for select
  to anon, authenticated
  using (id = (select public.request_school_id()));

create policy "schools: lettura propria scuola"
  on public.schools for select
  to authenticated
  using (id = (select public.auth_school_id()));

create policy "schools: admin aggiorna"
  on public.schools for update
  to authenticated
  using (id = (select public.auth_school_id()) and (select public.auth_is_admin()))
  with check (id = (select public.auth_school_id()));

-- ---------- classes ----------
drop policy if exists "classes: lettura con codice"     on public.classes;
drop policy if exists "classes: lettura propria scuola" on public.classes;
drop policy if exists "classes: admin gestisce"         on public.classes;

create policy "classes: lettura con codice"
  on public.classes for select
  to anon, authenticated
  using (school_id = (select public.request_school_id()));

create policy "classes: lettura propria scuola"
  on public.classes for select
  to authenticated
  using (school_id = (select public.auth_school_id()));

create policy "classes: admin gestisce"
  on public.classes for all
  to authenticated
  using (school_id = (select public.auth_school_id()) and (select public.auth_is_admin()))
  with check (school_id = (select public.auth_school_id()) and (select public.auth_is_admin()));

-- ---------- lessons ----------
drop policy if exists "lessons: lettura con codice"     on public.lessons;
drop policy if exists "lessons: lettura propria scuola" on public.lessons;
drop policy if exists "lessons: admin gestisce"         on public.lessons;

-- Ogni scuola legge SOLO le proprie lezioni tramite il suo codice unico.
create policy "lessons: lettura con codice"
  on public.lessons for select
  to anon, authenticated
  using (school_id = (select public.request_school_id()));

create policy "lessons: lettura propria scuola"
  on public.lessons for select
  to authenticated
  using (school_id = (select public.auth_school_id()));

create policy "lessons: admin gestisce"
  on public.lessons for all
  to authenticated
  using (school_id = (select public.auth_school_id()) and (select public.auth_is_admin()))
  with check (school_id = (select public.auth_school_id()) and (select public.auth_is_admin()));

-- ---------- profiles ----------
drop policy if exists "profiles: lettura stessa scuola" on public.profiles;
drop policy if exists "profiles: aggiorna il proprio"   on public.profiles;

create policy "profiles: lettura stessa scuola"
  on public.profiles for select
  to authenticated
  using (
    id = (select auth.uid())
    or school_id = (select public.auth_school_id())
  );

create policy "profiles: aggiorna il proprio"
  on public.profiles for update
  to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- Privilegi di colonna
-- -----------------------------------------------------------------------------
-- I visitatori anonimi non vedono mai access_code (neanche della propria scuola).
revoke select on public.schools from anon;
grant select (id, name, created_at) on public.schools to anon;

-- Gli utenti possono modificare solo il proprio nome: school_id e role vanno
-- assegnati da un amministratore tramite service role / SQL Editor.
revoke update on public.profiles from authenticated;
grant update (full_name) on public.profiles to authenticated;
