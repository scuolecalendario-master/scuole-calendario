-- =============================================================================
-- Dati di prova (eseguire DOPO le migrazioni). Due scuole con codici fissi, per
-- verificare che ciascuna veda solo le proprie lezioni.
-- Per rimuoverli: delete from public.schools where access_code like 'DEMO%';
-- =============================================================================

with s as (
  insert into public.schools (name, access_code) values
    ('Liceo Scientifico Demo',  'DEMOLICEO0000001'),
    ('Istituto Tecnico Demo',   'DEMOTECNICO00002')
  on conflict (access_code) do update set name = excluded.name
  returning id, access_code
),
c as (
  insert into public.classes (school_id, name, school_year)
  select s.id, v.name, '2026/2027'
  from s
  join (values
    ('DEMOLICEO0000001', '3A'), ('DEMOLICEO0000001', '4B'),
    ('DEMOTECNICO00002', '1C')
  ) as v(code, name) on v.code = s.access_code
  on conflict (school_id, name, school_year) do update set name = excluded.name
  returning id, school_id, name
)
insert into public.lessons (class_id, subject, teacher, room, starts_at, ends_at)
select c.id, l.subject, l.teacher, l.room,
       ((current_date + l.day_offset) + l.start_time) at time zone 'Europe/Rome',
       ((current_date + l.day_offset) + l.start_time + interval '1 hour') at time zone 'Europe/Rome'
from c
join (values
  ('3A', 'Matematica', 'Prof. Rossi',   'Aula 12', 0, time '08:00'),
  ('3A', 'Italiano',   'Prof.ssa Bianchi', 'Aula 12', 0, time '09:00'),
  ('4B', 'Fisica',     'Prof. Verdi',   'Lab 2',   1, time '10:00'),
  ('1C', 'Informatica','Prof. Neri',    'Lab INF', 0, time '08:00'),
  ('1C', 'Inglese',    'Prof.ssa Gialli', 'Aula 5', 1, time '11:00')
) as l(class_name, subject, teacher, room, day_offset, start_time)
  on l.class_name = c.name;
