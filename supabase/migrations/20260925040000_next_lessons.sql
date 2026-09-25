-- Prossima lezione (non annullata, non ancora finita) per ogni classe visibile.
-- security invoker: valgono RLS e privilegi di chi chiama (la maestra vede
-- solo le classi del proprio istituto).
create or replace function public.next_lessons()
returns table (class_id uuid, date date, start_time time, end_time time)
language sql
stable
security invoker
set search_path = ''
as $$
  select distinct on (l.class_id) l.class_id, l.date, l.start_time, l.end_time
  from public.lessons l
  where l.status <> 'cancelled'
    and (
      l.date > (now() at time zone 'Europe/Rome')::date
      or (l.date = (now() at time zone 'Europe/Rome')::date
          and l.end_time > (now() at time zone 'Europe/Rome')::time)
    )
  order by l.class_id, l.date, l.start_time;
$$;

revoke all on function public.next_lessons() from public;
grant execute on function public.next_lessons() to anon, authenticated;
