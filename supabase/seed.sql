-- =============================================================================
-- Dati di prova (eseguire DOPO le migrazioni). Due scuole con codici fissi:
--   /scuola/scuola-manzoni-demo0001
--   /scuola/istituto-rodari-demo0002
-- Lezioni due volte a settimana da 3 settimane fa a 2 settimane avanti:
-- quelle passate sono svolte (con presenze) o annullate.
-- Per rimuoverli: delete from public.schools where unique_code like '%-demo000_';
-- =============================================================================

insert into public.schools (name, unique_code, contact_email) values
  ('Scuola Manzoni',  'scuola-manzoni-demo0001',  'segreteria@manzoni.example'),
  ('Istituto Rodari', 'istituto-rodari-demo0002', 'info@rodari.example')
on conflict (unique_code) do nothing;

insert into public.classes (school_id, grade_name, total_enrolled)
select s.id, v.grade_name, v.enrolled
from public.schools s
join (values
  ('scuola-manzoni-demo0001',  '2A', 22),
  ('scuola-manzoni-demo0001',  '3B', 25),
  ('istituto-rodari-demo0002', '1C', 18),
  ('istituto-rodari-demo0002', '4A', 24)
) as v(code, grade_name, enrolled) on v.code = s.unique_code
on conflict (school_id, grade_name) do nothing;

insert into public.lessons (class_id, date, start_time, end_time, status, attendees_count)
select
  c.id,
  d::date,
  slot.start_time,
  slot.start_time + interval '45 minutes',
  case
    when d::date >= current_date then 'scheduled'
    when (extract(doy from d)::int + length(c.grade_name)) % 9 = 0 then 'cancelled'
    else 'done'
  end::public.lesson_status,
  case
    when d::date >= current_date then null
    when (extract(doy from d)::int + length(c.grade_name)) % 9 = 0 then null
    -- presenze tra ~75% e 100% degli iscritti
    else c.total_enrolled - (abs(hashtext(c.id::text || d::text)) % greatest(c.total_enrolled / 4, 1))
  end
from public.classes c
join public.schools s on s.id = c.school_id and s.unique_code like '%-demo000_'
join (values
  ('2A', 1, time '09:00'), ('2A', 3, time '09:00'),
  ('3B', 1, time '10:00'), ('3B', 4, time '10:00'),
  ('1C', 2, time '09:30'), ('1C', 4, time '11:00'),
  ('4A', 2, time '10:30'), ('4A', 5, time '09:00')
) as slot(grade_name, isodow, start_time) on slot.grade_name = c.grade_name
cross join generate_series(current_date - 21, current_date + 14, interval '1 day') as d
where extract(isodow from d) = slot.isodow
  and not exists (select 1 from public.lessons x where x.class_id = c.id and x.date = d::date);
