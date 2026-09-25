-- Senza codice scuola request_school_id() è NULL: il confronto deve dare
-- false (non NULL), altrimenti "not can_request_change(...)" non scatta.
create or replace function public.can_request_change(p_lesson_id uuid, p_school_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(p_school_id = public.request_school_id(), false)
     and exists (
       select 1 from public.lessons l
       where l.id = p_lesson_id
         and l.school_id = p_school_id
         and l.status <> 'cancelled'
         and l.date >= (now() at time zone 'Europe/Rome')::date
     );
$$;
