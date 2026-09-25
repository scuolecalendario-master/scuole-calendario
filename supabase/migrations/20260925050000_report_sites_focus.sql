-- Report: plesso e livello per classe + conteggio dei focus lavorati.
-- (Il tipo restituito cambia: la funzione va ricreata.)

drop function if exists public.lesson_report(date, date, uuid);

create function public.lesson_report(
  p_from date,
  p_to date,
  p_school_id uuid default null
)
returns table (
  school_id         uuid,
  school_name       text,
  site_name         text,
  class_id          uuid,
  grade_name        text,
  level             public.school_level,
  total_enrolled    integer,
  lessons_total     bigint,
  lessons_done      bigint,
  lessons_cancelled bigint,
  lessons_scheduled bigint,
  attendees_total   bigint,
  expected_total    bigint   -- somma degli iscritti sulle lezioni svolte
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
    s.id, s.name, si.name, c.id, c.grade_name, c.level, c.total_enrolled,
    count(l.id),
    count(l.id) filter (where l.status = 'done'),
    count(l.id) filter (where l.status = 'cancelled'),
    count(l.id) filter (where l.status = 'scheduled'),
    coalesce(sum(l.attendees_count) filter (where l.status = 'done'), 0)::bigint,
    coalesce(sum(c.total_enrolled) filter (where l.status = 'done'), 0)::bigint
  from public.classes c
  join public.schools s on s.id = c.school_id
  left join public.sites si on si.id = c.site_id
  left join public.lessons l
    on l.class_id = c.id and l.date between p_from and p_to
  where p_school_id is null or s.id = p_school_id
  group by s.id, s.name, si.name, c.id, c.grade_name, c.level, c.total_enrolled
  order by s.name, si.name nulls last, c.grade_name;
end;
$$;

revoke all on function public.lesson_report(date, date, uuid) from public;
grant execute on function public.lesson_report(date, date, uuid) to authenticated;

-- Quante lezioni svolte hanno lavorato ciascun focus, per livello.
create or replace function public.focus_report(
  p_from date,
  p_to date,
  p_school_id uuid default null
)
returns table (level public.school_level, focus text, lessons bigint)
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
  select c.level, f.focus, count(*)
  from public.lessons l
  join public.classes c on c.id = l.class_id
  cross join lateral unnest(l.focus) as f(focus)
  where l.status = 'done'
    and l.date between p_from and p_to
    and (p_school_id is null or l.school_id = p_school_id)
  group by c.level, f.focus
  order by c.level, count(*) desc;
end;
$$;

revoke all on function public.focus_report(date, date, uuid) from public;
grant execute on function public.focus_report(date, date, uuid) to authenticated;
