-- =============================================================================
-- Registrazione istruttori tramite codice (nessuna email inviata)
--
-- Il master genera un codice monouso e lo consegna all'istruttore, che si
-- registra con codice + email + password. Il ruolo arriva dal codice, non
-- dall'email: per questo la conferma email può restare disattivata.
-- Sostituisce la lista di email abilitate (staff_invites).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Rimozione del meccanismo a inviti email
-- -----------------------------------------------------------------------------
drop trigger if exists staff_invites_sync_profile on public.staff_invites;
drop function if exists public.staff_invites_sync_profile();
drop function if exists public.is_staff_email(text);
drop table if exists public.staff_invites;

-- Nuovo utente: profilo senza ruolo (lo assegna il codice o il master).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, lower(new.email), new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- Codici di registrazione
-- -----------------------------------------------------------------------------

-- Formato "ISTR-XXXX-XXXX": 8 caratteri casuali in base32 di Crockford
-- (niente I, L, O, U) → 32^8 ≈ 10^12 combinazioni. 256 è multiplo di 32,
-- quindi il modulo non introduce distorsioni.
create or replace function public.generate_registration_code()
returns text
language sql
volatile
set search_path = ''
as $$
  with chars as (
    select string_agg(
             substr('0123456789ABCDEFGHJKMNPQRSTVWXYZ',
                    1 + (get_byte(b, i) % 32), 1), '' order by i) as s
    from extensions.gen_random_bytes(8) as b, generate_series(0, 7) as i
  )
  select 'ISTR-' || substr(s, 1, 4) || '-' || substr(s, 5, 4) from chars;
$$;

create table public.registration_codes (
  id          uuid primary key default gen_random_uuid(),
  code        text not null unique default public.generate_registration_code(),
  role        public.user_role not null default 'instructor',
  label       text,                          -- es. nome dell'istruttore
  created_by  uuid references public.profiles (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '14 days',
  used_by     uuid references public.profiles (id) on delete set null,
  used_at     timestamptz
);

alter table public.registration_codes enable row level security;

create policy "registration_codes: master gestisce"
  on public.registration_codes for all to authenticated
  using ((select public.auth_role()) = 'master')
  with check ((select public.auth_role()) = 'master');

revoke all on public.registration_codes from anon;

-- Normalizza il codice digitato: maiuscolo, senza spazi/trattini, prefisso
-- facoltativo, O→0 e I/L→1 (errori di battitura tipici), trattini ricostruiti.
create or replace function public.normalize_registration_code(p_code text)
returns text
language sql
immutable
set search_path = ''
as $$
  select 'ISTR-' || substr(b, 1, 4) || '-' || substr(b, 5, 4)
  from (
    select translate(regexp_replace(c, '^ISTR', ''), 'OIL', '011') as b
    from (select regexp_replace(upper(coalesce(p_code, '')), '[^A-Z0-9]', '', 'g') as c) t
  ) t2;
$$;

-- Verifica preliminare (prima di creare l'account): il codice è utilizzabile?
create or replace function public.check_registration_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.registration_codes
    where code = public.normalize_registration_code(p_code)
      and used_at is null
      and expires_at > now()
  );
$$;

-- Riscatta il codice per l'utente autenticato e gli assegna il ruolo.
create or replace function public.redeem_registration_code(p_code text)
returns public.user_role
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid  uuid := (select auth.uid());
  v_code public.registration_codes;
begin
  if v_uid is null then
    raise exception 'Accesso richiesto' using errcode = '42501';
  end if;

  if (select role from public.profiles where id = v_uid) is not null then
    raise exception 'Questo account è già abilitato' using errcode = 'P0001';
  end if;

  select * into v_code
  from public.registration_codes
  where code = public.normalize_registration_code(p_code)
    and used_at is null
    and expires_at > now()
  for update;

  if not found then
    raise exception 'Codice non valido, già usato o scaduto' using errcode = 'P0002';
  end if;

  update public.registration_codes
     set used_by = v_uid, used_at = now()
   where id = v_code.id;

  update public.profiles
     set role = v_code.role,
         full_name = coalesce(full_name, v_code.label)
   where id = v_uid;

  return v_code.role;
end;
$$;

revoke all on function public.generate_registration_code()          from public;
revoke all on function public.normalize_registration_code(text)     from public;
revoke all on function public.check_registration_code(text)         from public;
revoke all on function public.redeem_registration_code(text)        from public;
grant execute on function public.generate_registration_code()       to authenticated;
grant execute on function public.normalize_registration_code(text)  to anon, authenticated;
grant execute on function public.check_registration_code(text)      to anon, authenticated;
grant execute on function public.redeem_registration_code(text)     to authenticated;
