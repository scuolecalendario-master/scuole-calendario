-- Richieste di spostamento attivabili per istituto (decide il master).
alter table public.schools
  add column change_requests_enabled boolean not null default true;

-- Il portale delle maestre deve sapere se mostrare "Chiedi uno spostamento".
grant select (change_requests_enabled) on public.schools to anon;

-- Il database rifiuta le richieste degli istituti in cui sono disattivate.
create or replace function public.can_request_change(p_lesson_id uuid, p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_school_id = public.request_school_id(), false)
     and exists (
       select 1 from public.schools s
       where s.id = p_school_id and s.change_requests_enabled
     )
     and exists (
       select 1 from public.lessons l
       where l.id = p_lesson_id
         and l.school_id = p_school_id
         and l.status <> 'cancelled'
         and l.date >= (now() at time zone 'Europe/Rome')::date
     );
$$;
