-- =============================================================================
-- Gli istruttori vedono SOLO gli istituti assegnati a loro:
--   * istituti in cui hanno almeno una classe (class_instructors)
--   * più gli istituti delle lezioni assegnate direttamente a loro (supplenze)
-- Il master continua a vedere tutto (policy "master gestisce", FOR ALL).
-- =============================================================================

create or replace function public.instructor_school_ids()
returns setof uuid
language sql
stable
security definer
set search_path = ''
as $$
  select c.school_id
  from public.class_instructors ci
  join public.classes c on c.id = ci.class_id
  where ci.profile_id = (select auth.uid())
  union
  select l.school_id
  from public.lessons l
  where l.instructor_id = (select auth.uid());
$$;

revoke all on function public.instructor_school_ids() from public;
grant execute on function public.instructor_school_ids() to authenticated;

-- ---------- schools ----------
drop policy if exists "schools: lettura staff" on public.schools;
create policy "schools: lettura istruttore"
  on public.schools for select to authenticated
  using (
    (select public.auth_role()) = 'instructor'
    and id in (select public.instructor_school_ids())
  );

-- ---------- sites ----------
drop policy if exists "sites: lettura staff" on public.sites;
create policy "sites: lettura istruttore"
  on public.sites for select to authenticated
  using (
    (select public.auth_role()) = 'instructor'
    and school_id in (select public.instructor_school_ids())
  );

-- ---------- classes ----------
drop policy if exists "classes: lettura staff" on public.classes;
create policy "classes: lettura istruttore"
  on public.classes for select to authenticated
  using (
    (select public.auth_role()) = 'instructor'
    and school_id in (select public.instructor_school_ids())
  );

-- ---------- lessons ----------
drop policy if exists "lessons: lettura staff" on public.lessons;
create policy "lessons: lettura istruttore"
  on public.lessons for select to authenticated
  using (
    (select public.auth_role()) = 'instructor'
    and (
      school_id in (select public.instructor_school_ids())
      or instructor_id = (select auth.uid())
    )
  );

-- ---------- class_instructors ----------
-- Serve a sapere quali classi sono "mie" e chi segue le altre classi degli
-- stessi istituti.
drop policy if exists "class_instructors: lettura staff" on public.class_instructors;
create policy "class_instructors: lettura istruttore"
  on public.class_instructors for select to authenticated
  using (
    (select public.auth_role()) = 'instructor'
    and exists (
      select 1 from public.classes c
      where c.id = class_id and c.school_id in (select public.instructor_school_ids())
    )
  );
