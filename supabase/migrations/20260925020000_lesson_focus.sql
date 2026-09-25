-- =============================================================================
-- Focus della lezione (più focus per lezione, catalogo per livello) e nuove
-- regole per gli istruttori: modificano SOLO svolta/programmata, presenti e
-- focus. Niente annullamento, niente note, niente lezioni già annullate.
-- Il catalogo deve coincidere con src/lib/focus.ts.
-- =============================================================================

create or replace function public.focus_catalog(p_level public.school_level)
returns text[]
language sql
immutable
set search_path = ''
as $$
  select case p_level
    when 'asilo' then array[
      'acquaticita', 'gioco_con', 'galleggiamenti_statici', 'galleggiamenti_dinamici',
      'togliamo_supporto', 'viso_bolle', 'propulsione_gambe', 'uso_braccia',
      'stile_basilare', 'dorso_basilare'
    ]
    else array[
      'galleggiamenti_statici_dinamici', 'spostamento_con_supporto', 'spostamento_senza_supporto',
      'tecnica_stile', 'tecnica_dorso', 'tecnica_rana', 'tecnica_farfalla',
      'quinto_stile', 'pallanuoto'
    ]
  end;
$$;

alter table public.lessons
  add column focus text[] not null default '{}',
  add column focus_note text check (char_length(focus_note) <= 200),
  add constraint lessons_focus_max check (cardinality(focus) <= 6);

-- Le maestre vedono i focus (ma non le note interne).
grant select (focus, focus_note) on public.lessons to anon;

create or replace function public.lessons_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_school_id uuid;
  v_enrolled  integer;
  v_level     public.school_level;
  v_uid       uuid := (select auth.uid());
begin
  -- Regole per gli istruttori (utenti autenticati non master)
  if tg_op = 'UPDATE' and v_uid is not null
     and public.auth_role() is distinct from 'master' then
    if old.status = 'cancelled' then
      raise exception 'La lezione è stata annullata: contatta l''amministratore'
        using errcode = '42501';
    end if;
    if new.status = 'cancelled' then
      raise exception 'Solo l''amministratore può annullare una lezione'
        using errcode = '42501';
    end if;
    if (new.class_id, new.date, new.start_time, new.end_time, new.notes)
       is distinct from (old.class_id, old.date, old.start_time, old.end_time, old.notes) then
      raise exception 'Gli istruttori possono modificare solo svolta, presenti e focus'
        using errcode = '42501';
    end if;
    if new.instructor_id is distinct from old.instructor_id
       and not (old.instructor_id is null and new.instructor_id = v_uid) then
      raise exception 'Un istruttore può solo assegnare a sé stesso una lezione senza istruttore'
        using errcode = '42501';
    end if;
  end if;

  select c.school_id, c.total_enrolled, c.level into v_school_id, v_enrolled, v_level
  from public.classes c where c.id = new.class_id;

  if v_school_id is null then
    raise exception 'Classe inesistente';
  end if;

  -- Presenti e focus hanno senso solo per una lezione svolta
  if new.status <> 'done' then
    new.attendees_count := null;
    new.focus := '{}';
    new.focus_note := null;
  end if;

  if new.attendees_count is not null and new.attendees_count > v_enrolled then
    raise exception 'Presenti (%) superiori agli iscritti della classe (%)',
      new.attendees_count, v_enrolled
      using errcode = '23514';
  end if;

  if not (new.focus <@ public.focus_catalog(v_level)) then
    raise exception 'Focus non previsti per il livello %', v_level
      using errcode = '23514';
  end if;

  if not ('gioco_con' = any (new.focus)) then
    new.focus_note := null;
  end if;

  new.school_id  := v_school_id;
  new.updated_at := now();
  return new;
end;
$$;
