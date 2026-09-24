-- =============================================================================
-- Modello dati v2: lezioni di nuoto per le scuole
--
-- Ruoli:
--   * Maestre (anonime): accedono con il codice scuola (header `x-school-code`)
--     e leggono solo classi e lezioni della propria scuola.
--   * instructor: legge tutto il calendario, aggiorna stato/presenze/note.
--   * master: controllo totale (scuole, classi, lezioni, utenti, report).
--
-- Sostituisce lo schema iniziale (conteneva solo dati demo).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Pulizia schema v1
-- -----------------------------------------------------------------------------
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists public.lessons  cascade;
drop table if exists public.classes  cascade;
drop table if exists public.profiles cascade;
drop table if exists public.schools  cascade;
drop function if exists public.lessons_set_school_id() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.request_school_id() cascade;
drop function if exists public.auth_school_id() cascade;
drop function if exists public.auth_is_admin() cascade;
drop type if exists public.user_role;

-- -----------------------------------------------------------------------------
-- Tipi
-- -----------------------------------------------------------------------------
create type public.user_role as enum ('master', 'instructor');
create type public.lesson_status as enum ('scheduled', 'done', 'cancelled');

-- -----------------------------------------------------------------------------
-- Generazione codice scuola: "<slug-nome>-<8 hex casuali>"
-- es. "Scuola Manzoni" -> "scuola-manzoni-8f3a1c2e"
-- Il suffisso casuale (32 bit) rende il codice non indovinabile dal solo nome.
-- -----------------------------------------------------------------------------
create or replace function public.generate_school_code(school_name text)
returns text
language sql
volatile
set search_path = ''
as $$
  select
    coalesce(
      nullif(
        left(
          trim(both '-' from regexp_replace(
            lower(translate(school_name,
              'àáâäèéêëìíîïòóôöùúûüçñÀÁÂÄÈÉÊËÌÍÎÏÒÓÔÖÙÚÛÜÇÑ',
              'aaaaeeeeiiiioooouuuucnaaaaeeeeiiiioooouuuucn')),
            '[^a-z0-9]+', '-', 'g')),
          40),
        ''),
      'scuola')
    || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
$$;

-- -----------------------------------------------------------------------------
-- Tabelle
-- -----------------------------------------------------------------------------
create table public.schools (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  unique_code    text not null unique
                 check (unique_code ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and char_length(unique_code) >= 8),
  contact_email  text,
  created_at     timestamptz not null default now()
);

create table public.classes (
  id              uuid primary key default gen_random_uuid(),
  school_id       uuid not null references public.schools (id) on delete cascade,
  grade_name      text not null,                          -- es. "3A"
  total_enrolled  integer not null default 0 check (total_enrolled >= 0),
  created_at      timestamptz not null default now(),
  unique (school_id, grade_name)
);

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  -- null = account registrato ma non ancora autorizzato dal master
  role        public.user_role,
  created_at  timestamptz not null default now()
);

create table public.lessons (
  id               uuid primary key default gen_random_uuid(),
  class_id         uuid not null references public.classes (id) on delete cascade,
  -- denormalizzato per RLS e report; mantenuto dal trigger lessons_before_write
  school_id        uuid not null references public.schools (id) on delete cascade,
  date             date not null,
  start_time       time not null,
  end_time         time not null,
  status           public.lesson_status not null default 'scheduled',
  attendees_count  integer check (attendees_count >= 0),
  notes            text,
  instructor_id    uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (end_time > start_time)
);

create index classes_school_id_idx   on public.classes (school_id);
create index lessons_school_date_idx on public.lessons (school_id, date, start_time);
create index lessons_class_date_idx  on public.lessons (class_id, date);
create index lessons_date_idx        on public.lessons (date, start_time);
create index lessons_instructor_idx  on public.lessons (instructor_id);

-- -----------------------------------------------------------------------------
-- Helper per RLS (security definer: nessuna ricorsione nelle policy)
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
  where s.unique_code = lower(trim(
    coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-school-code'
  ));
$$;

-- Ruolo dell'utente autenticato (null se anonimo o non autorizzato).
create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid());
$$;

revoke all on function public.request_school_id() from public;
revoke all on function public.auth_role()         from public;
grant execute on function public.request_school_id() to anon, authenticated;
grant execute on function public.auth_role()         to authenticated;

-- -----------------------------------------------------------------------------
-- Trigger
-- -----------------------------------------------------------------------------

-- Codice scuola generato automaticamente se non fornito.
create or replace function public.schools_before_insert()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.unique_code is null or new.unique_code = '' then
    new.unique_code := public.generate_school_code(new.name);
  else
    new.unique_code := lower(trim(new.unique_code));
  end if;
  return new;
end;
$$;

create trigger schools_before_insert
  before insert on public.schools
  for each row execute function public.schools_before_insert();

-- Lezioni: school_id coerente con la classe, presenze <= iscritti,
-- e gli istruttori possono modificare solo stato, presenze e note.
create or replace function public.lessons_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_enrolled  integer;
begin
  if tg_op = 'UPDATE' and public.auth_role() is distinct from 'master'
     and (select auth.uid()) is not null then
    if (new.class_id, new.date, new.start_time, new.end_time, new.instructor_id)
       is distinct from
       (old.class_id, old.date, old.start_time, old.end_time, old.instructor_id) then
      raise exception 'Gli istruttori possono modificare solo stato, presenze e note'
        using errcode = '42501';
    end if;
  end if;

  select c.school_id, c.total_enrolled into v_school_id, v_enrolled
  from public.classes c where c.id = new.class_id;

  if v_school_id is null then
    raise exception 'Classe inesistente';
  end if;

  if new.attendees_count is not null and new.attendees_count > v_enrolled then
    raise exception 'Presenti (%) superiori agli iscritti della classe (%)',
      new.attendees_count, v_enrolled
      using errcode = '23514';
  end if;

  new.school_id  := v_school_id;
  new.updated_at := now();
  return new;
end;
$$;

create trigger lessons_before_write
  before insert or update on public.lessons
  for each row execute function public.lessons_before_write();

-- Profilo creato alla registrazione, senza ruolo (lo assegna il master).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- Row Level Security
-- -----------------------------------------------------------------------------
alter table public.schools  enable row level security;
alter table public.classes  enable row level security;
alter table public.lessons  enable row level security;
alter table public.profiles enable row level security;

-- ---------- schools ----------
create policy "schools: lettura con codice"
  on public.schools for select to anon, authenticated
  using (id = (select public.request_school_id()));

create policy "schools: lettura staff"
  on public.schools for select to authenticated
  using ((select public.auth_role()) is not null);

create policy "schools: master gestisce"
  on public.schools for all to authenticated
  using ((select public.auth_role()) = 'master')
  with check ((select public.auth_role()) = 'master');

-- ---------- classes ----------
create policy "classes: lettura con codice"
  on public.classes for select to anon, authenticated
  using (school_id = (select public.request_school_id()));

create policy "classes: lettura staff"
  on public.classes for select to authenticated
  using ((select public.auth_role()) is not null);

create policy "classes: master gestisce"
  on public.classes for all to authenticated
  using ((select public.auth_role()) = 'master')
  with check ((select public.auth_role()) = 'master');

-- ---------- lessons ----------
create policy "lessons: lettura con codice"
  on public.lessons for select to anon, authenticated
  using (school_id = (select public.request_school_id()));

create policy "lessons: lettura staff"
  on public.lessons for select to authenticated
  using ((select public.auth_role()) is not null);

create policy "lessons: istruttore aggiorna"
  on public.lessons for update to authenticated
  using ((select public.auth_role()) = 'instructor')
  with check ((select public.auth_role()) = 'instructor');

create policy "lessons: master gestisce"
  on public.lessons for all to authenticated
  using ((select public.auth_role()) = 'master')
  with check ((select public.auth_role()) = 'master');

-- ---------- profiles ----------
create policy "profiles: lettura propria"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: lettura staff"
  on public.profiles for select to authenticated
  using ((select public.auth_role()) is not null);

create policy "profiles: master gestisce"
  on public.profiles for update to authenticated
  using ((select public.auth_role()) = 'master')
  with check ((select public.auth_role()) = 'master');

-- -----------------------------------------------------------------------------
-- Privilegi
-- -----------------------------------------------------------------------------
-- Le maestre (anon) sono in sola lettura e non vedono codici, email e note interne.
revoke all on public.schools, public.classes, public.lessons, public.profiles from anon;
grant select (id, name) on public.schools to anon;
grant select on public.classes to anon;
grant select (id, class_id, school_id, date, start_time, end_time, status, attendees_count)
  on public.lessons to anon;

-- Gli utenti non possono auto-promuoversi: niente insert/delete sui profili,
-- e l'update (solo master via RLS) è limitato a nome e ruolo.
revoke insert, delete on public.profiles from authenticated;
revoke update on public.profiles from authenticated;
grant update (full_name, role) on public.profiles to authenticated;

-- -----------------------------------------------------------------------------
-- Report (solo master): aggregati per classe in un intervallo di date
-- -----------------------------------------------------------------------------
create or replace function public.lesson_report(
  p_from date,
  p_to date,
  p_school_id uuid default null
)
returns table (
  school_id        uuid,
  school_name      text,
  class_id         uuid,
  grade_name       text,
  total_enrolled   integer,
  lessons_total    bigint,
  lessons_done     bigint,
  lessons_cancelled bigint,
  lessons_scheduled bigint,
  attendees_total  bigint,
  expected_total   bigint   -- somma degli iscritti sulle lezioni svolte
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if public.auth_role() is distinct from 'master' then
    raise exception 'Solo il master può consultare i report' using errcode = '42501';
  end if;

  return query
  select
    s.id, s.name, c.id, c.grade_name, c.total_enrolled,
    count(l.id),
    count(l.id) filter (where l.status = 'done'),
    count(l.id) filter (where l.status = 'cancelled'),
    count(l.id) filter (where l.status = 'scheduled'),
    coalesce(sum(l.attendees_count) filter (where l.status = 'done'), 0)::bigint,
    coalesce(sum(c.total_enrolled) filter (where l.status = 'done'), 0)::bigint
  from public.classes c
  join public.schools s on s.id = c.school_id
  left join public.lessons l
    on l.class_id = c.id and l.date between p_from and p_to
  where p_school_id is null or s.id = p_school_id
  group by s.id, s.name, c.id, c.grade_name, c.total_enrolled
  order by s.name, c.grade_name;
end;
$$;

revoke all on function public.lesson_report(date, date, uuid) from public;
grant execute on function public.lesson_report(date, date, uuid) to authenticated;
