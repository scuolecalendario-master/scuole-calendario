-- =============================================================================
-- Fase 3: gestione scuole/classi e abilitazione istruttori via email
--
-- Il master abilita un'email in `staff_invites`. Al primo accesso (codice via
-- email) l'account viene creato e riceve il ruolo; se l'account esiste già il
-- ruolo viene assegnato subito. Rimuovendo l'email il ruolo viene revocato.
-- =============================================================================

create table public.staff_invites (
  email       text primary key
              check (email = lower(email) and email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  role        public.user_role not null default 'instructor',
  full_name   text,
  invited_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now()
);

alter table public.staff_invites enable row level security;

create policy "staff_invites: master gestisce"
  on public.staff_invites for all to authenticated
  using ((select public.auth_role()) = 'master')
  with check ((select public.auth_role()) = 'master');

revoke all on public.staff_invites from anon;

-- Email dei profili normalizzate, per il confronto con gli inviti.
update public.profiles set email = lower(email) where email <> lower(email);
create index if not exists profiles_email_idx on public.profiles (email);

-- -----------------------------------------------------------------------------
-- Nuovo utente: prende ruolo e nome dall'invito, se presente.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.staff_invites;
begin
  select * into v_invite from public.staff_invites where email = lower(new.email);

  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', v_invite.full_name),
    v_invite.role
  );
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Invito aggiunto/modificato/rimosso: sincronizza il profilo esistente.
-- -----------------------------------------------------------------------------
create or replace function public.staff_invites_sync_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    -- Revoca solo il ruolo concesso dall'invito (non tocca altri ruoli).
    update public.profiles
       set role = null
     where email = old.email and role = old.role;
    return old;
  end if;

  update public.profiles
     set role = new.role,
         full_name = coalesce(full_name, new.full_name)
   where email = new.email;
  return new;
end;
$$;

create trigger staff_invites_sync_profile
  after insert or update or delete on public.staff_invites
  for each row execute function public.staff_invites_sync_profile();

-- -----------------------------------------------------------------------------
-- Il login con codice email è consentito solo alle email abilitate.
-- (Chiamata dal server prima di inviare il codice.)
-- -----------------------------------------------------------------------------
create or replace function public.is_staff_email(p_email text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.staff_invites where email = lower(trim(p_email)))
      or exists (select 1 from public.profiles
                 where email = lower(trim(p_email)) and role is not null);
$$;

revoke all on function public.is_staff_email(text) from public;
grant execute on function public.is_staff_email(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- Rigenera il codice di una scuola (il vecchio link smette di funzionare).
-- -----------------------------------------------------------------------------
create or replace function public.regenerate_school_code(p_school_id uuid)
returns text
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  v_code text;
begin
  if public.auth_role() is distinct from 'master' then
    raise exception 'Solo il master può rigenerare i codici' using errcode = '42501';
  end if;

  update public.schools
     set unique_code = public.generate_school_code(name)
   where id = p_school_id
  returning unique_code into v_code;

  if v_code is null then
    raise exception 'Scuola inesistente';
  end if;
  return v_code;
end;
$$;

revoke all on function public.regenerate_school_code(uuid) from public;
grant execute on function public.regenerate_school_code(uuid) to authenticated;

-- Il trigger normalizza il codice anche in update (es. codice scelto a mano);
-- cambiare il nome della scuola NON cambia il codice.
drop trigger if exists schools_before_insert on public.schools;
create trigger schools_before_write
  before insert or update of unique_code on public.schools
  for each row execute function public.schools_before_insert();
