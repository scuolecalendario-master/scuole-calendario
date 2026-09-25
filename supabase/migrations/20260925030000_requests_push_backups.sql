-- =============================================================================
-- Richieste di spostamento dalle scuole, sottoscrizioni push, bucket backup.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Richieste di spostamento ("solo messaggio": il master legge e sposta a mano)
-- -----------------------------------------------------------------------------
create table public.change_requests (
  id             uuid primary key default gen_random_uuid(),
  school_id      uuid not null references public.schools (id) on delete cascade,
  lesson_id      uuid not null references public.lessons (id) on delete cascade,
  teacher_name   text not null check (char_length(trim(teacher_name)) between 2 and 80),
  message        text not null check (char_length(trim(message)) between 3 and 500),
  proposed_date  date,
  proposed_time  time,
  handled_at     timestamptz,
  handled_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index change_requests_open_idx on public.change_requests (created_at) where handled_at is null;
create index change_requests_lesson_idx on public.change_requests (lesson_id);

alter table public.change_requests enable row level security;

-- La lezione è futura (fuso italiano) e appartiene alla scuola del codice?
create or replace function public.can_request_change(p_lesson_id uuid, p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select p_school_id = public.request_school_id()
     and exists (
       select 1 from public.lessons l
       where l.id = p_lesson_id
         and l.school_id = p_school_id
         and l.status <> 'cancelled'
         and l.date >= (now() at time zone 'Europe/Rome')::date
     );
$$;

revoke all on function public.can_request_change(uuid, uuid) from public;
grant execute on function public.can_request_change(uuid, uuid) to anon, authenticated;

create policy "change_requests: la scuola invia"
  on public.change_requests for insert to anon, authenticated
  with check (
    public.can_request_change(lesson_id, school_id)
    and handled_at is null and handled_by is null
  );

create policy "change_requests: master gestisce"
  on public.change_requests for all to authenticated
  using ((select public.auth_role()) = 'master')
  with check ((select public.auth_role()) = 'master');

-- Le scuole possono solo inviare (niente lettura: "solo messaggio").
revoke all on public.change_requests from anon;
grant insert (school_id, lesson_id, teacher_name, message, proposed_date, proposed_time)
  on public.change_requests to anon;

-- Anti-spam: al massimo 3 richieste aperte per lezione.
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
  return new;
end;
$$;

create trigger change_requests_limit
  before insert on public.change_requests
  for each row execute function public.change_requests_limit();

-- -----------------------------------------------------------------------------
-- Sottoscrizioni alle notifiche push (una per dispositivo)
-- Scritte dal server con la chiave segreta; ognuno vede solo le proprie.
-- -----------------------------------------------------------------------------
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now()
);
create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: le proprie"
  on public.push_subscriptions for select to authenticated
  using (profile_id = (select auth.uid()));

revoke all on public.push_subscriptions from anon;
revoke insert, update, delete on public.push_subscriptions from authenticated;

-- -----------------------------------------------------------------------------
-- Bucket privato per i backup: nessuna policy → solo la chiave segreta.
-- -----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('backups', 'backups', false)
on conflict (id) do nothing;
