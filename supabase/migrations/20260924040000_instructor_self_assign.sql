-- =============================================================================
-- Fase 5: un istruttore che registra una lezione senza istruttore assegnato
-- può assegnarla a sé stesso (e solo a sé stesso). Tutto il resto invariato:
-- può modificare solo stato, presenze e note.
-- =============================================================================

create or replace function public.lessons_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_enrolled  integer;
  v_uid       uuid := (select auth.uid());
begin
  if tg_op = 'UPDATE' and v_uid is not null
     and public.auth_role() is distinct from 'master' then
    if (new.class_id, new.date, new.start_time, new.end_time)
       is distinct from (old.class_id, old.date, old.start_time, old.end_time) then
      raise exception 'Gli istruttori possono modificare solo stato, presenze e note'
        using errcode = '42501';
    end if;
    if new.instructor_id is distinct from old.instructor_id
       and not (old.instructor_id is null and new.instructor_id = v_uid) then
      raise exception 'Un istruttore può solo assegnare a sé stesso una lezione senza istruttore'
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
