-- Il limite di richieste aperte non deve rivelare nulla a chi non ha il codice
-- della scuola: prima si verifica l'autorizzazione, poi si contano le richieste.
create or replace function public.change_requests_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.auth_role() is distinct from 'master'
     and not public.can_request_change(new.lesson_id, new.school_id) then
    raise exception 'Richiesta non consentita' using errcode = '42501';
  end if;
  if (select count(*) from public.change_requests
      where lesson_id = new.lesson_id and handled_at is null) >= 3 then
    raise exception 'Ci sono già richieste in attesa per questa lezione'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
