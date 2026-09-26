-- =============================================================================
-- Dati di prova per lo sviluppo locale (eseguire DOPO le migrazioni).
-- Due istituti con codici fissi:
--   /scuola/scuola-manzoni-demo0001   (2 plessi, elementari + medie)
--   /scuola/istituto-rodari-demo0002  (asilo + elementari, richieste disattivate)
-- Lezioni due volte a settimana da 3 settimane fa a 2 settimane avanti:
-- quelle passate sono svolte (con presenti e focus) o annullate.
-- Gli istruttori delle classi non sono qui: servono account veri. Crea un
-- codice in /admin/istruttori, registrati e assegnalo alle classi dall'istituto.
-- Per rimuoverli: delete from public.schools where unique_code like '%-demo000_';
-- =============================================================================

insert into public.schools (name, unique_code, contact_email, change_requests_enabled) values
  ('Scuola Manzoni',  'scuola-manzoni-demo0001',  'segreteria@manzoni.example', true),
  ('Istituto Rodari', 'istituto-rodari-demo0002', 'info@rodari.example',        false)
on conflict (unique_code) do nothing;

insert into public.sites (school_id, name)
select s.id, v.name
from public.schools s
join (values
  ('scuola-manzoni-demo0001', 'Plesso Verdi'),
  ('scuola-manzoni-demo0001', 'Plesso Carducci')
) as v(code, name) on v.code = s.unique_code
on conflict (school_id, name) do nothing;

insert into public.classes (school_id, site_id, grade_name, level, total_enrolled)
select s.id, st.id, v.grade_name, v.level::public.school_level, v.enrolled
from public.schools s
join (values
  ('scuola-manzoni-demo0001',  'Plesso Verdi',    '2A',       'elementari', 22),
  ('scuola-manzoni-demo0001',  'Plesso Carducci', '3B',       'medie',      25),
  ('istituto-rodari-demo0002', null,              'Grandi',   'asilo',      18),
  ('istituto-rodari-demo0002', null,              '4A',       'elementari', 24)
) as v(code, site, grade_name, level, enrolled) on v.code = s.unique_code
left join public.sites st on st.school_id = s.id and st.name = v.site
on conflict (school_id, grade_name) do nothing;

insert into public.lessons (class_id, date, start_time, end_time, status, attendees_count, focus)
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
    -- presenti tra ~75% e 100% degli iscritti
    else c.total_enrolled - (abs(hashtext(c.id::text || d::text)) % greatest(c.total_enrolled / 4, 1))
  end,
  -- due focus del livello della classe (il trigger li azzera se non svolta)
  case when c.level = 'asilo'
    then array['acquaticita', 'viso_bolle']
    else array['tecnica_stile', 'tecnica_dorso']
  end
from public.classes c
join public.schools s on s.id = c.school_id and s.unique_code like '%-demo000_'
join (values
  ('2A',     1, time '09:00'), ('2A',     3, time '09:00'),
  ('3B',     1, time '10:00'), ('3B',     4, time '10:00'),
  ('Grandi', 2, time '09:30'), ('Grandi', 4, time '11:00'),
  ('4A',     2, time '10:30'), ('4A',     5, time '09:00')
) as slot(grade_name, isodow, start_time) on slot.grade_name = c.grade_name
cross join generate_series(current_date - 21, current_date + 14, interval '1 day') as d
where extract(isodow from d) = slot.isodow
  and not exists (select 1 from public.lessons x where x.class_id = c.id and x.date = d::date);
